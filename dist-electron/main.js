"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
class CsvError extends Error {
  constructor(code, message, options, ...contexts) {
    if (Array.isArray(message)) message = message.join(" ").trim();
    super(message);
    if (Error.captureStackTrace !== void 0) {
      Error.captureStackTrace(this, CsvError);
    }
    this.code = code;
    for (const context of contexts) {
      for (const key in context) {
        const value = context[key];
        this[key] = Buffer.isBuffer(value) ? value.toString(options.encoding) : value == null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }
}
const is_object = function(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
};
const normalize_columns_array = function(columns) {
  const normalizedColumns = [];
  for (let i = 0, l = columns.length; i < l; i++) {
    const column = columns[i];
    if (column === void 0 || column === null || column === false) {
      normalizedColumns[i] = { disabled: true };
    } else if (typeof column === "string") {
      normalizedColumns[i] = { name: column };
    } else if (is_object(column)) {
      if (typeof column.name !== "string") {
        throw new CsvError("CSV_OPTION_COLUMNS_MISSING_NAME", [
          "Option columns missing name:",
          `property "name" is required at position ${i}`,
          "when column is an object literal"
        ]);
      }
      normalizedColumns[i] = column;
    } else {
      throw new CsvError("CSV_INVALID_COLUMN_DEFINITION", [
        "Invalid column definition:",
        "expect a string or a literal object,",
        `got ${JSON.stringify(column)} at position ${i}`
      ]);
    }
  }
  return normalizedColumns;
};
class ResizeableBuffer {
  constructor(size = 100) {
    this.size = size;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size);
  }
  prepend(val) {
    if (Buffer.isBuffer(val)) {
      const length = this.length + val.length;
      if (length >= this.size) {
        this.resize();
        if (length >= this.size) {
          throw Error("INVALID_BUFFER_STATE");
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    } else {
      const length = this.length++;
      if (length === this.size) {
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf, 1, 0, length);
    }
  }
  append(val) {
    const length = this.length++;
    if (length === this.size) {
      this.resize();
    }
    this.buf[length] = val;
  }
  clone() {
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize() {
    const length = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf, 0, 0, length);
    this.buf = buf;
  }
  toString(encoding) {
    if (encoding) {
      return this.buf.slice(0, this.length).toString(encoding);
    } else {
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON() {
    return this.toString("utf8");
  }
  reset() {
    this.length = 0;
  }
}
const np = 12;
const cr$1 = 13;
const nl$1 = 10;
const space = 32;
const tab = 9;
const init_state = function(options) {
  return {
    bomSkipped: false,
    bufBytesStart: 0,
    castField: options.cast_function,
    commenting: false,
    // Current error encountered by a record
    error: void 0,
    enabled: options.from_line === 1,
    escaping: false,
    escapeIsQuote: Buffer.isBuffer(options.escape) && Buffer.isBuffer(options.quote) && Buffer.compare(options.escape, options.quote) === 0,
    // columns can be `false`, `true`, `Array`
    expectedRecordLength: Array.isArray(options.columns) ? options.columns.length : void 0,
    field: new ResizeableBuffer(20),
    firstLineToHeaders: options.cast_first_line_to_header,
    needMoreDataSize: Math.max(
      // Skip if the remaining buffer smaller than comment
      options.comment !== null ? options.comment.length : 0,
      ...options.delimiter.map((delimiter) => delimiter.length),
      // Skip if the remaining buffer can be escape sequence
      options.quote !== null ? options.quote.length : 0
    ),
    previousBuf: void 0,
    quoting: false,
    stop: false,
    rawBuffer: new ResizeableBuffer(100),
    record: [],
    recordHasError: false,
    record_length: 0,
    recordDelimiterMaxLength: options.record_delimiter.length === 0 ? 0 : Math.max(...options.record_delimiter.map((v) => v.length)),
    trimChars: [
      Buffer.from(" ", options.encoding)[0],
      Buffer.from("	", options.encoding)[0]
    ],
    wasQuoting: false,
    wasRowDelimiter: false,
    timchars: [
      Buffer.from(Buffer.from([cr$1], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([nl$1], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([np], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([space], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([tab], "utf8").toString(), options.encoding)
    ]
  };
};
const underscore = function(str) {
  return str.replace(/([A-Z])/g, function(_, match) {
    return "_" + match.toLowerCase();
  });
};
const normalize_options = function(opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore(opt)] = opts[opt];
  }
  if (options.encoding === void 0 || options.encoding === true) {
    options.encoding = "utf8";
  } else if (options.encoding === null || options.encoding === false) {
    options.encoding = null;
  } else if (typeof options.encoding !== "string" && options.encoding !== null) {
    throw new CsvError(
      "CSV_INVALID_OPTION_ENCODING",
      [
        "Invalid option encoding:",
        "encoding must be a string or null to return a buffer,",
        `got ${JSON.stringify(options.encoding)}`
      ],
      options
    );
  }
  if (options.bom === void 0 || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_BOM",
      [
        "Invalid option bom:",
        "bom must be true,",
        `got ${JSON.stringify(options.bom)}`
      ],
      options
    );
  }
  options.cast_function = null;
  if (options.cast === void 0 || options.cast === null || options.cast === false || options.cast === "") {
    options.cast = void 0;
  } else if (typeof options.cast === "function") {
    options.cast_function = options.cast;
    options.cast = true;
  } else if (options.cast !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST",
      [
        "Invalid option cast:",
        "cast must be true or a function,",
        `got ${JSON.stringify(options.cast)}`
      ],
      options
    );
  }
  if (options.cast_date === void 0 || options.cast_date === null || options.cast_date === false || options.cast_date === "") {
    options.cast_date = false;
  } else if (options.cast_date === true) {
    options.cast_date = function(value) {
      const date = Date.parse(value);
      return !isNaN(date) ? new Date(date) : value;
    };
  } else if (typeof options.cast_date !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST_DATE",
      [
        "Invalid option cast_date:",
        "cast_date must be true or a function,",
        `got ${JSON.stringify(options.cast_date)}`
      ],
      options
    );
  }
  options.cast_first_line_to_header = void 0;
  if (options.columns === true) {
    options.cast_first_line_to_header = void 0;
  } else if (typeof options.columns === "function") {
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  } else if (Array.isArray(options.columns)) {
    options.columns = normalize_columns_array(options.columns);
  } else if (options.columns === void 0 || options.columns === null || options.columns === false) {
    options.columns = false;
  } else {
    throw new CsvError(
      "CSV_INVALID_OPTION_COLUMNS",
      [
        "Invalid option columns:",
        "expect an array, a function or true,",
        `got ${JSON.stringify(options.columns)}`
      ],
      options
    );
  }
  if (options.group_columns_by_name === void 0 || options.group_columns_by_name === null || options.group_columns_by_name === false) {
    options.group_columns_by_name = false;
  } else if (options.group_columns_by_name !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "expect an boolean,",
        `got ${JSON.stringify(options.group_columns_by_name)}`
      ],
      options
    );
  } else if (options.columns === false) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "the `columns` mode must be activated."
      ],
      options
    );
  }
  if (options.comment === void 0 || options.comment === null || options.comment === false || options.comment === "") {
    options.comment = null;
  } else {
    if (typeof options.comment === "string") {
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if (!Buffer.isBuffer(options.comment)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_COMMENT",
        [
          "Invalid option comment:",
          "comment must be a buffer or a string,",
          `got ${JSON.stringify(options.comment)}`
        ],
        options
      );
    }
  }
  if (options.comment_no_infix === void 0 || options.comment_no_infix === null || options.comment_no_infix === false) {
    options.comment_no_infix = false;
  } else if (options.comment_no_infix !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_COMMENT",
      [
        "Invalid option comment_no_infix:",
        "value must be a boolean,",
        `got ${JSON.stringify(options.comment_no_infix)}`
      ],
      options
    );
  }
  const delimiter_json = JSON.stringify(options.delimiter);
  if (!Array.isArray(options.delimiter))
    options.delimiter = [options.delimiter];
  if (options.delimiter.length === 0) {
    throw new CsvError(
      "CSV_INVALID_OPTION_DELIMITER",
      [
        "Invalid option delimiter:",
        "delimiter must be a non empty string or buffer or array of string|buffer,",
        `got ${delimiter_json}`
      ],
      options
    );
  }
  options.delimiter = options.delimiter.map(function(delimiter) {
    if (delimiter === void 0 || delimiter === null || delimiter === false) {
      return Buffer.from(",", options.encoding);
    }
    if (typeof delimiter === "string") {
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if (!Buffer.isBuffer(delimiter) || delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER",
        [
          "Invalid option delimiter:",
          "delimiter must be a non empty string or buffer or array of string|buffer,",
          `got ${delimiter_json}`
        ],
        options
      );
    }
    return delimiter;
  });
  if (options.escape === void 0 || options.escape === true) {
    options.escape = Buffer.from('"', options.encoding);
  } else if (typeof options.escape === "string") {
    options.escape = Buffer.from(options.escape, options.encoding);
  } else if (options.escape === null || options.escape === false) {
    options.escape = null;
  }
  if (options.escape !== null) {
    if (!Buffer.isBuffer(options.escape)) {
      throw new Error(
        `Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`
      );
    }
  }
  if (options.from === void 0 || options.from === null) {
    options.from = 1;
  } else {
    if (typeof options.from === "string" && /\d+/.test(options.from)) {
      options.from = parseInt(options.from);
    }
    if (Number.isInteger(options.from)) {
      if (options.from < 0) {
        throw new Error(
          `Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`
      );
    }
  }
  if (options.from_line === void 0 || options.from_line === null) {
    options.from_line = 1;
  } else {
    if (typeof options.from_line === "string" && /\d+/.test(options.from_line)) {
      options.from_line = parseInt(options.from_line);
    }
    if (Number.isInteger(options.from_line)) {
      if (options.from_line <= 0) {
        throw new Error(
          `Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`
      );
    }
  }
  if (options.ignore_last_delimiters === void 0 || options.ignore_last_delimiters === null) {
    options.ignore_last_delimiters = false;
  } else if (typeof options.ignore_last_delimiters === "number") {
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if (options.ignore_last_delimiters === 0) {
      options.ignore_last_delimiters = false;
    }
  } else if (typeof options.ignore_last_delimiters !== "boolean") {
    throw new CsvError(
      "CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS",
      [
        "Invalid option `ignore_last_delimiters`:",
        "the value must be a boolean value or an integer,",
        `got ${JSON.stringify(options.ignore_last_delimiters)}`
      ],
      options
    );
  }
  if (options.ignore_last_delimiters === true && options.columns === false) {
    throw new CsvError(
      "CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS",
      [
        "The option `ignore_last_delimiters`",
        "requires the activation of the `columns` option"
      ],
      options
    );
  }
  if (options.info === void 0 || options.info === null || options.info === false) {
    options.info = false;
  } else if (options.info !== true) {
    throw new Error(
      `Invalid Option: info must be true, got ${JSON.stringify(options.info)}`
    );
  }
  if (options.max_record_size === void 0 || options.max_record_size === null || options.max_record_size === false) {
    options.max_record_size = 0;
  } else if (Number.isInteger(options.max_record_size) && options.max_record_size >= 0) ;
  else if (typeof options.max_record_size === "string" && /\d+/.test(options.max_record_size)) {
    options.max_record_size = parseInt(options.max_record_size);
  } else {
    throw new Error(
      `Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`
    );
  }
  if (options.objname === void 0 || options.objname === null || options.objname === false) {
    options.objname = void 0;
  } else if (Buffer.isBuffer(options.objname)) {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if (options.encoding === null) ;
    else {
      options.objname = options.objname.toString(options.encoding);
    }
  } else if (typeof options.objname === "string") {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
  } else if (typeof options.objname === "number") ;
  else {
    throw new Error(
      `Invalid Option: objname must be a string or a buffer, got ${options.objname}`
    );
  }
  if (options.objname !== void 0) {
    if (typeof options.objname === "number") {
      if (options.columns !== false) {
        throw Error(
          "Invalid Option: objname index cannot be combined with columns or be defined as a field"
        );
      }
    } else {
      if (options.columns === false) {
        throw Error(
          "Invalid Option: objname field must be combined with columns or be defined as an index"
        );
      }
    }
  }
  if (options.on_record === void 0 || options.on_record === null) {
    options.on_record = void 0;
  } else if (typeof options.on_record !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_ON_RECORD",
      [
        "Invalid option `on_record`:",
        "expect a function,",
        `got ${JSON.stringify(options.on_record)}`
      ],
      options
    );
  }
  if (options.on_skip !== void 0 && options.on_skip !== null && typeof options.on_skip !== "function") {
    throw new Error(
      `Invalid Option: on_skip must be a function, got ${JSON.stringify(options.on_skip)}`
    );
  }
  if (options.quote === null || options.quote === false || options.quote === "") {
    options.quote = null;
  } else {
    if (options.quote === void 0 || options.quote === true) {
      options.quote = Buffer.from('"', options.encoding);
    } else if (typeof options.quote === "string") {
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if (!Buffer.isBuffer(options.quote)) {
      throw new Error(
        `Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`
      );
    }
  }
  if (options.raw === void 0 || options.raw === null || options.raw === false) {
    options.raw = false;
  } else if (options.raw !== true) {
    throw new Error(
      `Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`
    );
  }
  if (options.record_delimiter === void 0) {
    options.record_delimiter = [];
  } else if (typeof options.record_delimiter === "string" || Buffer.isBuffer(options.record_delimiter)) {
    if (options.record_delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer,",
          `got ${JSON.stringify(options.record_delimiter)}`
        ],
        options
      );
    }
    options.record_delimiter = [options.record_delimiter];
  } else if (!Array.isArray(options.record_delimiter)) {
    throw new CsvError(
      "CSV_INVALID_OPTION_RECORD_DELIMITER",
      [
        "Invalid option `record_delimiter`:",
        "value must be a string, a buffer or array of string|buffer,",
        `got ${JSON.stringify(options.record_delimiter)}`
      ],
      options
    );
  }
  options.record_delimiter = options.record_delimiter.map(function(rd, i) {
    if (typeof rd !== "string" && !Buffer.isBuffer(rd)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a string, a buffer or array of string|buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    } else if (rd.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    }
    if (typeof rd === "string") {
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  if (typeof options.relax_column_count === "boolean") ;
  else if (options.relax_column_count === void 0 || options.relax_column_count === null) {
    options.relax_column_count = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`
    );
  }
  if (typeof options.relax_column_count_less === "boolean") ;
  else if (options.relax_column_count_less === void 0 || options.relax_column_count_less === null) {
    options.relax_column_count_less = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`
    );
  }
  if (typeof options.relax_column_count_more === "boolean") ;
  else if (options.relax_column_count_more === void 0 || options.relax_column_count_more === null) {
    options.relax_column_count_more = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`
    );
  }
  if (typeof options.relax_quotes === "boolean") ;
  else if (options.relax_quotes === void 0 || options.relax_quotes === null) {
    options.relax_quotes = false;
  } else {
    throw new Error(
      `Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`
    );
  }
  if (typeof options.skip_empty_lines === "boolean") ;
  else if (options.skip_empty_lines === void 0 || options.skip_empty_lines === null) {
    options.skip_empty_lines = false;
  } else {
    throw new Error(
      `Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`
    );
  }
  if (typeof options.skip_records_with_empty_values === "boolean") ;
  else if (options.skip_records_with_empty_values === void 0 || options.skip_records_with_empty_values === null) {
    options.skip_records_with_empty_values = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`
    );
  }
  if (typeof options.skip_records_with_error === "boolean") ;
  else if (options.skip_records_with_error === void 0 || options.skip_records_with_error === null) {
    options.skip_records_with_error = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`
    );
  }
  if (options.rtrim === void 0 || options.rtrim === null || options.rtrim === false) {
    options.rtrim = false;
  } else if (options.rtrim !== true) {
    throw new Error(
      `Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`
    );
  }
  if (options.ltrim === void 0 || options.ltrim === null || options.ltrim === false) {
    options.ltrim = false;
  } else if (options.ltrim !== true) {
    throw new Error(
      `Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`
    );
  }
  if (options.trim === void 0 || options.trim === null || options.trim === false) {
    options.trim = false;
  } else if (options.trim !== true) {
    throw new Error(
      `Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`
    );
  }
  if (options.trim === true && opts.ltrim !== false) {
    options.ltrim = true;
  } else if (options.ltrim !== true) {
    options.ltrim = false;
  }
  if (options.trim === true && opts.rtrim !== false) {
    options.rtrim = true;
  } else if (options.rtrim !== true) {
    options.rtrim = false;
  }
  if (options.to === void 0 || options.to === null) {
    options.to = -1;
  } else if (options.to !== -1) {
    if (typeof options.to === "string" && /\d+/.test(options.to)) {
      options.to = parseInt(options.to);
    }
    if (Number.isInteger(options.to)) {
      if (options.to <= 0) {
        throw new Error(
          `Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`
      );
    }
  }
  if (options.to_line === void 0 || options.to_line === null) {
    options.to_line = -1;
  } else if (options.to_line !== -1) {
    if (typeof options.to_line === "string" && /\d+/.test(options.to_line)) {
      options.to_line = parseInt(options.to_line);
    }
    if (Number.isInteger(options.to_line)) {
      if (options.to_line <= 0) {
        throw new Error(
          `Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`
      );
    }
  }
  return options;
};
const isRecordEmpty = function(record) {
  return record.every(
    (field) => field == null || field.toString && field.toString().trim() === ""
  );
};
const cr = 13;
const nl = 10;
const boms = {
  // Note, the following are equals:
  // Buffer.from("\ufeff")
  // Buffer.from([239, 187, 191])
  // Buffer.from('EFBBBF', 'hex')
  utf8: Buffer.from([239, 187, 191]),
  // Note, the following are equals:
  // Buffer.from "\ufeff", 'utf16le
  // Buffer.from([255, 254])
  utf16le: Buffer.from([255, 254])
};
const transform = function(original_options = {}) {
  const info = {
    bytes: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0
  };
  const options = normalize_options(original_options);
  return {
    info,
    original_options,
    options,
    state: init_state(options),
    __needMoreData: function(i, bufLen, end) {
      if (end) return false;
      const { encoding, escape, quote } = this.options;
      const { quoting, needMoreDataSize, recordDelimiterMaxLength } = this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(
        needMoreDataSize,
        // Skip if the remaining buffer smaller than record delimiter
        // If "record_delimiter" is yet to be discovered:
        // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
        // 2. We set the length to windows line ending in the current encoding
        // Note, that encoding is known from user or bom discovery at that point
        // recordDelimiterMaxLength,
        recordDelimiterMaxLength === 0 ? Buffer.from("\r\n", encoding).length : recordDelimiterMaxLength,
        // Skip if remaining buffer can be an escaped quote
        quoting ? (escape === null ? 0 : escape.length) + quote.length : 0,
        // Skip if remaining buffer can be record delimiter following the closing quote
        quoting ? quote.length + recordDelimiterMaxLength : 0
      );
      return numOfCharLeft < requiredLength;
    },
    // Central parser implementation
    parse: function(nextBuf, end, push, close) {
      const {
        bom,
        comment_no_infix,
        encoding,
        from_line,
        ltrim,
        max_record_size,
        raw,
        relax_quotes,
        rtrim,
        skip_empty_lines,
        to,
        to_line
      } = this.options;
      let { comment, escape, quote, record_delimiter } = this.options;
      const { bomSkipped, previousBuf, rawBuffer, escapeIsQuote } = this.state;
      let buf;
      if (previousBuf === void 0) {
        if (nextBuf === void 0) {
          close();
          return;
        } else {
          buf = nextBuf;
        }
      } else if (previousBuf !== void 0 && nextBuf === void 0) {
        buf = previousBuf;
      } else {
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      if (bomSkipped === false) {
        if (bom === false) {
          this.state.bomSkipped = true;
        } else if (buf.length < 3) {
          if (end === false) {
            this.state.previousBuf = buf;
            return;
          }
        } else {
          for (const encoding2 in boms) {
            if (boms[encoding2].compare(buf, 0, boms[encoding2].length) === 0) {
              const bomLength = boms[encoding2].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              const options2 = normalize_options({
                ...this.original_options,
                encoding: encoding2
              });
              for (const key in options2) {
                this.options[key] = options2[key];
              }
              ({ comment, escape, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for (pos = 0; pos < bufLen; pos++) {
        if (this.__needMoreData(pos, bufLen, end)) {
          break;
        }
        if (this.state.wasRowDelimiter === true) {
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if (to_line !== -1 && this.info.lines > to_line) {
          this.state.stop = true;
          close();
          return;
        }
        if (this.state.quoting === false && record_delimiter.length === 0) {
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(
            buf,
            pos
          );
          if (record_delimiterCount) {
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if (raw === true) {
          rawBuffer.append(chr);
        }
        if ((chr === cr || chr === nl) && this.state.wasRowDelimiter === false) {
          this.state.wasRowDelimiter = true;
        }
        if (this.state.escaping === true) {
          this.state.escaping = false;
        } else {
          if (escape !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape.length < bufLen) {
            if (escapeIsQuote) {
              if (this.__isQuote(buf, pos + escape.length)) {
                this.state.escaping = true;
                pos += escape.length - 1;
                continue;
              }
            } else {
              this.state.escaping = true;
              pos += escape.length - 1;
              continue;
            }
          }
          if (this.state.commenting === false && this.__isQuote(buf, pos)) {
            if (this.state.quoting === true) {
              const nextChr = buf[pos + quote.length];
              const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos + quote.length);
              const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos + quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(
                buf,
                pos + quote.length,
                nextChr
              );
              const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos + quote.length) : this.__isRecordDelimiter(nextChr, buf, pos + quote.length);
              if (escape !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape.length)) {
                pos += escape.length - 1;
              } else if (!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable) {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              } else if (relax_quotes === false) {
                const err = this.__error(
                  new CsvError(
                    "CSV_INVALID_CLOSING_QUOTE",
                    [
                      "Invalid Closing Quote:",
                      `got "${String.fromCharCode(nextChr)}"`,
                      `at line ${this.info.lines}`,
                      "instead of delimiter, record delimiter, trimable character",
                      "(if activated) or comment"
                    ],
                    this.options,
                    this.__infoField()
                  )
                );
                if (err !== void 0) return err;
              } else {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            } else {
              if (this.state.field.length !== 0) {
                if (relax_quotes === false) {
                  const info2 = this.__infoField();
                  const bom2 = Object.keys(boms).map(
                    (b) => boms[b].equals(this.state.field.toString()) ? b : false
                  ).filter(Boolean)[0];
                  const err = this.__error(
                    new CsvError(
                      "INVALID_OPENING_QUOTE",
                      [
                        "Invalid Opening Quote:",
                        `a quote is found on field ${JSON.stringify(info2.column)} at line ${info2.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                        bom2 ? `(${bom2} bom)` : void 0
                      ],
                      this.options,
                      info2,
                      {
                        field: this.state.field
                      }
                    )
                  );
                  if (err !== void 0) return err;
                }
              } else {
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if (this.state.quoting === false) {
            const recordDelimiterLength = this.__isRecordDelimiter(
              chr,
              buf,
              pos
            );
            if (recordDelimiterLength !== 0) {
              const skipCommentLine = this.state.commenting && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0;
              if (skipCommentLine) {
                this.info.comment_lines++;
              } else {
                if (this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1 : 0) >= from_line) {
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                if (skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0) {
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if (errField !== void 0) return errField;
                this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if (errRecord !== void 0) return errRecord;
                if (to !== -1 && this.info.records >= to) {
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if (this.state.commenting) {
              continue;
            }
            if (comment !== null && (comment_no_infix === false || this.state.record.length === 0 && this.state.field.length === 0)) {
              const commentCount = this.__compareBytes(comment, buf, pos, chr);
              if (commentCount !== 0) {
                this.state.commenting = true;
                continue;
              }
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if (delimiterLength !== 0) {
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if (errField !== void 0) return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if (this.state.commenting === false) {
          if (max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size) {
            return this.__error(
              new CsvError(
                "CSV_MAX_RECORD_SIZE",
                [
                  "Max Record Size:",
                  "record exceed the maximum number of tolerated bytes",
                  `of ${max_record_size}`,
                  `at line ${this.info.lines}`
                ],
                this.options,
                this.__infoField()
              )
            );
          }
        }
        const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if (lappend === true && rappend === true) {
          this.state.field.append(chr);
        } else if (rtrim === true && !this.__isCharTrimable(buf, pos)) {
          return this.__error(
            new CsvError(
              "CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE",
              [
                "Invalid Closing Quote:",
                "found non trimable byte after quote",
                `at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
        } else {
          if (lappend === false) {
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if (end === true) {
        if (this.state.quoting === true) {
          const err = this.__error(
            new CsvError(
              "CSV_QUOTE_NOT_CLOSED",
              [
                "Quote Not Closed:",
                `the parsing is finished with an opening quote at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
          if (err !== void 0) return err;
        } else {
          if (this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0) {
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if (errField !== void 0) return errField;
            const errRecord = this.__onRecord(push);
            if (errRecord !== void 0) return errRecord;
          } else if (this.state.wasRowDelimiter === true) {
            this.info.empty_lines++;
          } else if (this.state.commenting === true) {
            this.info.comment_lines++;
          }
        }
      } else {
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if (this.state.wasRowDelimiter === true) {
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    },
    __onRecord: function(push) {
      const {
        columns,
        group_columns_by_name,
        encoding,
        info: info2,
        from,
        relax_column_count,
        relax_column_count_less,
        relax_column_count_more,
        raw,
        skip_records_with_empty_values
      } = this.options;
      const { enabled, record } = this.state;
      if (enabled === false) {
        return this.__resetRecord();
      }
      const recordLength = record.length;
      if (columns === true) {
        if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record);
      }
      if (columns === false && this.info.records === 0) {
        this.state.expectedRecordLength = recordLength;
      }
      if (recordLength !== this.state.expectedRecordLength) {
        const err = columns === false ? new CsvError(
          "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH",
          [
            "Invalid Record Length:",
            `expect ${this.state.expectedRecordLength},`,
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        ) : new CsvError(
          "CSV_RECORD_INCONSISTENT_COLUMNS",
          [
            "Invalid Record Length:",
            `columns length is ${columns.length},`,
            // rename columns
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        );
        if (relax_column_count === true || relax_column_count_less === true && recordLength < this.state.expectedRecordLength || relax_column_count_more === true && recordLength > this.state.expectedRecordLength) {
          this.info.invalid_field_length++;
          this.state.error = err;
        } else {
          const finalErr = this.__error(err);
          if (finalErr) return finalErr;
        }
      }
      if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
        this.__resetRecord();
        return;
      }
      if (this.state.recordHasError === true) {
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if (from === 1 || this.info.records >= from) {
        const { objname } = this.options;
        if (columns !== false) {
          const obj = {};
          for (let i = 0, l = record.length; i < l; i++) {
            if (columns[i] === void 0 || columns[i].disabled) continue;
            if (group_columns_by_name === true && obj[columns[i].name] !== void 0) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record[i]];
              }
            } else {
              obj[columns[i].name] = record[i];
            }
          }
          if (raw === true || info2 === true) {
            const extRecord = Object.assign(
              { record: obj },
              raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info2 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [obj[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? obj : [obj[objname], obj],
              push
            );
            if (err) {
              return err;
            }
          }
        } else {
          if (raw === true || info2 === true) {
            const extRecord = Object.assign(
              { record },
              raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info2 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [record[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? record : [record[objname], record],
              push
            );
            if (err) {
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    },
    __firstLineToColumns: function(record) {
      const { firstLineToHeaders } = this.state;
      try {
        const headers = firstLineToHeaders === void 0 ? record : firstLineToHeaders.call(null, record);
        if (!Array.isArray(headers)) {
          return this.__error(
            new CsvError(
              "CSV_INVALID_COLUMN_MAPPING",
              [
                "Invalid Column Mapping:",
                "expect an array from column function,",
                `got ${JSON.stringify(headers)}`
              ],
              this.options,
              this.__infoField(),
              {
                headers
              }
            )
          );
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      } catch (err) {
        return err;
      }
    },
    __resetRecord: function() {
      if (this.options.raw === true) {
        this.state.rawBuffer.reset();
      }
      this.state.error = void 0;
      this.state.record = [];
      this.state.record_length = 0;
    },
    __onField: function() {
      const { cast, encoding, rtrim, max_record_size } = this.options;
      const { enabled, wasQuoting } = this.state;
      if (enabled === false) {
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if (rtrim === true && wasQuoting === false) {
        field = field.trimRight();
      }
      if (cast === true) {
        const [err, f] = this.__cast(field);
        if (err !== void 0) return err;
        field = f;
      }
      this.state.record.push(field);
      if (max_record_size !== 0 && typeof field === "string") {
        this.state.record_length += field.length;
      }
      this.__resetField();
    },
    __resetField: function() {
      this.state.field.reset();
      this.state.wasQuoting = false;
    },
    __push: function(record, push) {
      const { on_record } = this.options;
      if (on_record !== void 0) {
        const info2 = this.__infoRecord();
        try {
          record = on_record.call(null, record, info2);
        } catch (err) {
          return err;
        }
        if (record === void 0 || record === null) {
          return;
        }
      }
      push(record);
    },
    // Return a tuple with the error and the casted value
    __cast: function(field) {
      const { columns, relax_column_count } = this.options;
      const isColumns = Array.isArray(columns);
      if (isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length) {
        return [void 0, void 0];
      }
      if (this.state.castField !== null) {
        try {
          const info2 = this.__infoField();
          return [void 0, this.state.castField.call(null, field, info2)];
        } catch (err) {
          return [err];
        }
      }
      if (this.__isFloat(field)) {
        return [void 0, parseFloat(field)];
      } else if (this.options.cast_date !== false) {
        const info2 = this.__infoField();
        return [void 0, this.options.cast_date.call(null, field, info2)];
      }
      return [void 0, field];
    },
    // Helper to test if a character is a space or a line delimiter
    __isCharTrimable: function(buf, pos) {
      const isTrim = (buf2, pos2) => {
        const { timchars } = this.state;
        loop1: for (let i = 0; i < timchars.length; i++) {
          const timchar = timchars[i];
          for (let j = 0; j < timchar.length; j++) {
            if (timchar[j] !== buf2[pos2 + j]) continue loop1;
          }
          return timchar.length;
        }
        return 0;
      };
      return isTrim(buf, pos);
    },
    // Keep it in case we implement the `cast_int` option
    // __isInt(value){
    //   // return Number.isInteger(parseInt(value))
    //   // return !isNaN( parseInt( obj ) );
    //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
    // }
    __isFloat: function(value) {
      return value - parseFloat(value) + 1 >= 0;
    },
    __compareBytes: function(sourceBuf, targetBuf, targetPos, firstByte) {
      if (sourceBuf[0] !== firstByte) return 0;
      const sourceLength = sourceBuf.length;
      for (let i = 1; i < sourceLength; i++) {
        if (sourceBuf[i] !== targetBuf[targetPos + i]) return 0;
      }
      return sourceLength;
    },
    __isDelimiter: function(buf, pos, chr) {
      const { delimiter, ignore_last_delimiters } = this.options;
      if (ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1) {
        return 0;
      } else if (ignore_last_delimiters !== false && typeof ignore_last_delimiters === "number" && this.state.record.length === ignore_last_delimiters - 1) {
        return 0;
      }
      loop1: for (let i = 0; i < delimiter.length; i++) {
        const del = delimiter[i];
        if (del[0] === chr) {
          for (let j = 1; j < del.length; j++) {
            if (del[j] !== buf[pos + j]) continue loop1;
          }
          return del.length;
        }
      }
      return 0;
    },
    __isRecordDelimiter: function(chr, buf, pos) {
      const { record_delimiter } = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1: for (let i = 0; i < recordDelimiterLength; i++) {
        const rd = record_delimiter[i];
        const rdLength = rd.length;
        if (rd[0] !== chr) {
          continue;
        }
        for (let j = 1; j < rdLength; j++) {
          if (rd[j] !== buf[pos + j]) {
            continue loop1;
          }
        }
        return rd.length;
      }
      return 0;
    },
    __isEscape: function(buf, pos, chr) {
      const { escape } = this.options;
      if (escape === null) return false;
      const l = escape.length;
      if (escape[0] === chr) {
        for (let i = 0; i < l; i++) {
          if (escape[i] !== buf[pos + i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    __isQuote: function(buf, pos) {
      const { quote } = this.options;
      if (quote === null) return false;
      const l = quote.length;
      for (let i = 0; i < l; i++) {
        if (quote[i] !== buf[pos + i]) {
          return false;
        }
      }
      return true;
    },
    __autoDiscoverRecordDelimiter: function(buf, pos) {
      const { encoding } = this.options;
      const rds = [
        // Important, the windows line ending must be before mac os 9
        Buffer.from("\r\n", encoding),
        Buffer.from("\n", encoding),
        Buffer.from("\r", encoding)
      ];
      loop: for (let i = 0; i < rds.length; i++) {
        const l = rds[i].length;
        for (let j = 0; j < l; j++) {
          if (rds[i][j] !== buf[pos + j]) {
            continue loop;
          }
        }
        this.options.record_delimiter.push(rds[i]);
        this.state.recordDelimiterMaxLength = rds[i].length;
        return rds[i].length;
      }
      return 0;
    },
    __error: function(msg) {
      const { encoding, raw, skip_records_with_error } = this.options;
      const err = typeof msg === "string" ? new Error(msg) : msg;
      if (skip_records_with_error) {
        this.state.recordHasError = true;
        if (this.options.on_skip !== void 0) {
          try {
            this.options.on_skip(
              err,
              raw ? this.state.rawBuffer.toString(encoding) : void 0
            );
          } catch (err2) {
            return err2;
          }
        }
        return void 0;
      } else {
        return err;
      }
    },
    __infoDataSet: function() {
      return {
        ...this.info,
        columns: this.options.columns
      };
    },
    __infoRecord: function() {
      const { columns, raw, encoding } = this.options;
      return {
        ...this.__infoDataSet(),
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw ? this.state.rawBuffer.toString(encoding) : void 0
      };
    },
    __infoField: function() {
      const { columns } = this.options;
      const isColumns = Array.isArray(columns);
      return {
        ...this.__infoRecord(),
        column: isColumns === true ? columns.length > this.state.record.length ? columns[this.state.record.length].name : null : this.state.record.length,
        quoting: this.state.wasQuoting
      };
    }
  };
};
const parse = function(data, opts = {}) {
  if (typeof data === "string") {
    data = Buffer.from(data);
  }
  const records = opts && opts.objname ? {} : [];
  const parser = transform(opts);
  const push = (record) => {
    if (parser.options.objname === void 0) records.push(record);
    else {
      records[record[0]] = record[1];
    }
  };
  const close = () => {
  };
  const error = parser.parse(data, true, push, close);
  if (error !== void 0) throw error;
  return records;
};
process.env.DIST_ELECTRON = path.join(__dirname, "../dist-electron");
process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
let win = null;
let steamView = null;
const STEAM_ROOT_URL = "https://partner.steampowered.com/";
const STEAM_ALL_APPS_URL = "https://partner.steampowered.com/nav_games.php";
const TARGET_URL_PATTERN = /partner\.steampowered\.com\/app\/details\/(\d+)/;
const ALL_PRODUCTS_PATTERN = /partner\.steampowered\.com\/nav_games\.php(?:\?|$)/;
let backgroundView = null;
let autoOpenedOnLaunch = false;
function createWindow() {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png";
  win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    // Prevent black screen on Windows: show only after content is ready
    icon: path.join(process.env.PUBLIC ?? "", iconName),
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.js"),
      nodeIntegration: true,
      contextIsolation: false
      // For easier IPC in this prototype
    },
    backgroundColor: "#000000",
    // Dark background for dashboard feel
    titleBarStyle: "hiddenInset",
    // Native-like dark bar on macOS
    trafficLightPosition: { x: 12, y: 12 }
  });
  const showWindowWhenReady = () => {
    if (!win || win.isDestroyed()) return;
    if (steamView && !steamView.webContents.isDestroyed() && !dashboardActive) {
      const bounds = win.getContentBounds();
      if (bounds.width > 0 && bounds.height > 0) {
        steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
      }
    }
    win.show();
  };
  win.once("ready-to-show", showWindowWhenReady);
  setTimeout(showWindowWhenReady, 8e3);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    win?.webContents.send("dashboard-visibility", dashboardActive);
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST ?? "", "index.html"));
  }
  createSteamView();
  createBackgroundView();
}
function createBackgroundView() {
  if (!win) return;
  backgroundView = new electron.BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
}
function createSteamView() {
  if (!win) return;
  steamView = new electron.BrowserView({
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/steam-preload.js"),
      nodeIntegration: true,
      // Enable Node for preload to use ipcRenderer easily
      contextIsolation: false,
      // Allow direct access
      sandbox: false
      // Disable sandbox to ensure Node APIs work
      // partition: 'persist:steam', // Keep session
    }
  });
  steamView.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  win.setBrowserView(steamView);
  const bounds = win.getContentBounds();
  steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  win.on("resize", () => {
    if (steamView && !dashboardActive) {
      const bounds2 = win?.getContentBounds();
      if (bounds2) {
        steamView.setBounds({ x: 0, y: 0, width: bounds2.width, height: bounds2.height });
      }
    }
  });
  steamView.webContents.loadURL(STEAM_ROOT_URL);
  steamView.webContents.on("did-finish-load", () => {
    checkUrl();
  });
  steamView.webContents.on("did-navigate", () => {
    checkUrl();
  });
  steamView.webContents.on("did-navigate-in-page", () => {
    checkUrl();
  });
  steamView.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error("Steam View failed to load:", errorCode, errorDescription, validatedURL);
    if (errorCode === -3) return;
    setDashboardVisibility(false);
    setTimeout(() => {
      if (!steamView || steamView.webContents.isDestroyed()) return;
      steamView.webContents.loadURL(STEAM_ROOT_URL);
    }, 1500);
  });
}
let dashboardActive = false;
let activeWishlistDownloadToken = 0;
let attemptedAllAppsRedirect = false;
async function checkUrl() {
  if (!steamView || steamView.webContents.isDestroyed()) return;
  const url = steamView.webContents.getURL();
  console.log("Current URL:", url);
  if (url.includes("/login/") || url.includes("login.steampowered.com")) {
    console.log("Login page detected. Hiding Dashboard to allow login.");
    setDashboardVisibility(false);
    autoOpenedOnLaunch = false;
    attemptedAllAppsRedirect = false;
    win?.webContents.send("steam-target-detected", false);
    return;
  }
  if (url === STEAM_ROOT_URL || url.startsWith(`${STEAM_ROOT_URL}home`)) {
    console.log("Steam root/home detected.");
    setDashboardVisibility(false);
    autoOpenedOnLaunch = false;
    if (!attemptedAllAppsRedirect && steamView && !steamView.webContents.isDestroyed()) {
      attemptedAllAppsRedirect = true;
      steamView.webContents.loadURL(STEAM_ALL_APPS_URL);
    }
    return;
  }
  const isTarget = TARGET_URL_PATTERN.test(url);
  const isAllProducts = ALL_PRODUCTS_PATTERN.test(url);
  console.log(`URL Analysis: isTarget=${isTarget}, isAllProducts=${isAllProducts}`);
  if (isTarget) {
    attemptedAllAppsRedirect = false;
    console.log("Target URL detected! Showing Dashboard option.");
    scrapeData();
    console.log("Sending show-dashboard-button to Steam View");
    setTimeout(() => {
      if (!steamView || steamView.webContents.isDestroyed()) return;
      steamView.webContents.send("show-dashboard-button", true);
    }, 500);
    startAutoRefresh();
    const match = url.match(/app\/details\/(\d+)/);
    const appId = match ? match[1] : null;
    win?.webContents.send("steam-target-detected", appId);
    if (appId) {
      fetchHistory(appId);
    }
  } else if (isAllProducts) {
    const inspection = await steamView.webContents.executeJavaScript(`
      (function() {
        const text = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase()
        const gameLinks = document.querySelectorAll('a[href*="/app/details/"]').length
        const hasNotFound = text.includes('file not found') || text.includes('not found')
        return { gameLinks, hasNotFound }
      })()
    `).catch(() => ({ gameLinks: 0, hasNotFound: false }));
    if (inspection.hasNotFound || inspection.gameLinks === 0) {
      setDashboardVisibility(false);
      autoOpenedOnLaunch = false;
      win?.webContents.send("steam-target-detected", false);
      if (url.includes("/nav_games.php") && steamView && !steamView.webContents.isDestroyed()) {
        steamView.webContents.loadURL(STEAM_ROOT_URL);
      }
      return;
    }
    attemptedAllAppsRedirect = false;
    console.log("All Products URL detected! Showing Portfolio Dashboard.");
    fetchPortfolioToday();
    console.log("Sending show-dashboard-button to Steam View for Portfolio");
    setTimeout(() => {
      if (!steamView || steamView.webContents.isDestroyed()) return;
      steamView.webContents.send("show-dashboard-button", true);
    }, 500);
    win?.webContents.send("steam-target-detected", "portfolio");
    if (!autoOpenedOnLaunch) {
      console.log("Auto-opening dashboard for Portfolio view");
      autoOpenedOnLaunch = true;
      setDashboardVisibility(true);
    }
  } else {
    console.log("No matching pattern. Keeping dashboard hidden.");
    win?.webContents.send("steam-target-detected", false);
  }
}
const FETCH_COOLDOWN = 3 * 60 * 60 * 1e3;
const HISTORY_FILE = path.join(electron.app.getPath("userData"), "steam-history.json");
const WISHLIST_FILE = path.join(electron.app.getPath("userData"), "steam-wishlist.json");
const PLAYTIME_FILE = path.join(electron.app.getPath("userData"), "steam-playtime.json");
const PLAYERS_FILE = path.join(electron.app.getPath("userData"), "steam-players.json");
const PORTFOLIO_TODAY_FILE = path.join(electron.app.getPath("userData"), "steam-portfolio-today.json");
const PORTFOLIO_ALLHISTORY_FILE = path.join(electron.app.getPath("userData"), "steam-portfolio-allhistory.json");
function loadPlaytimeStore() {
  try {
    if (fs.existsSync(PLAYTIME_FILE)) return JSON.parse(fs.readFileSync(PLAYTIME_FILE, "utf-8"));
  } catch {
  }
  return {};
}
function savePlaytimeStore(store) {
  try {
    fs.writeFileSync(PLAYTIME_FILE, JSON.stringify(store, null, 2));
  } catch {
  }
}
function parseMinutes(text) {
  const t = (text || "").trim();
  const h = t.match(/(\d+)\s*hour/i);
  const m = t.match(/(\d+)\s*min/i);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}
function fetchPlaytime(appId) {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  const now = Date.now();
  const store = loadPlaytimeStore();
  const cached = store[appId];
  if (cached && cached.data && now - cached.lastUpdated < FETCH_COOLDOWN) {
    console.log(`[playtime] Serving cached data for ${appId} — triggering players`);
    win?.webContents.send("steam-playtime-update", { appId, playtime: cached.data });
    fetchPlayers(appId);
    return;
  }
  if (win) {
    win.addBrowserView(backgroundView);
    backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
  const url = `https://partner.steampowered.com/app/playtime/${appId}/`;
  console.log(`[playtime] Fetching ${url}`);
  backgroundView.webContents.removeAllListeners("did-finish-load");
  backgroundView.webContents.loadURL(url);
  backgroundView.webContents.once("did-finish-load", () => {
    setTimeout(async () => {
      try {
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
        const result = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const getText = (el) => (el ? (el.innerText || el.textContent || '').trim() : '')
            // Key stats table (first table)
            let lifetimeUsers = 0, avgTime = '', medianTime = '', rangeMin = '', rangeMax = ''
            const tables = document.querySelectorAll('table')
            const firstTb = tables[0]
            if (firstTb) {
              const rows = firstTb.querySelectorAll('tr')
              for (const row of rows) {
                const tds = row.querySelectorAll('td')
                if (tds.length < 2) continue
                const label = getText(tds[0]).toLowerCase()
                const val = getText(tds[1])
                if (label.includes('lifetime users')) lifetimeUsers = parseInt(val.replace(/,/g,'')) || 0
                else if (label.includes('average time')) avgTime = val
                else if (label.includes('median time')) medianTime = val
                else if (label.includes('time played range')) rangeMin = val
              }
              // The range max is on the next row (empty label)
              for (let i = 0; i < rows.length - 1; i++) {
                const tds = rows[i].querySelectorAll('td')
                if (tds.length >= 1 && getText(tds[0]).toLowerCase().includes('time played range')) {
                  const nextTds = rows[i+1]?.querySelectorAll('td') || []
                  if (nextTds.length >= 2) rangeMax = getText(nextTds[1])
                }
              }
            }
            // Retention table (second table with thead)
            const retention = []
            for (const table of tables) {
              const thead = table.querySelector('thead')
              if (!thead) continue
              const bodyRows = table.querySelectorAll('tbody tr')
              for (const row of bodyRows) {
                const tds = row.querySelectorAll('td')
                if (tds.length < 2) continue
                const threshold = getText(tds[0])
                const pct = parseInt(getText(tds[1]).replace('%','')) || 0
                retention.push({ threshold, percentage: pct })
              }
              break
            }
            return { lifetimeUsers, avgTime, medianTime, rangeMin, rangeMax, retention }
          })()
        `);
        if (!result || !result.lifetimeUsers) {
          console.error("[playtime] Failed to parse playtime page for", appId);
          return;
        }
        const thresholdMinutes = {
          "10 minutes": 10,
          "30 minutes": 30,
          "1 hour 0 minutes": 60,
          "2 hours 0 minutes": 120,
          "5 hours 0 minutes": 300,
          "10 hours 0 minutes": 600,
          "20 hours 0 minutes": 1200,
          "50 hours 0 minutes": 3e3,
          "100 hours 0 minutes": 6e3
        };
        const retention = (result.retention || []).map((r) => ({
          threshold: r.threshold,
          minutes: thresholdMinutes[r.threshold] ?? parseMinutes(r.threshold),
          percentage: r.percentage
        }));
        const data = {
          lifetimeUsers: result.lifetimeUsers,
          avgMinutes: parseMinutes(result.avgTime),
          medianMinutes: parseMinutes(result.medianTime),
          rangeMinStr: result.rangeMin,
          rangeMaxStr: result.rangeMax,
          retention
        };
        store[appId] = { lastUpdated: Date.now(), data };
        savePlaytimeStore(store);
        console.log(`[playtime] Saved playtime for ${appId}: users=${data.lifetimeUsers} avg=${data.avgMinutes}m median=${data.medianMinutes}m retention=${retention.length} rows`);
        win?.webContents.send("steam-playtime-update", { appId, playtime: data });
        fetchPlayers(appId);
      } catch (e) {
        console.error("[playtime] Error:", e);
        fetchPlayers(appId);
      }
    }, 2e3);
  });
}
function loadPlayersStore() {
  try {
    if (fs.existsSync(PLAYERS_FILE)) return JSON.parse(fs.readFileSync(PLAYERS_FILE, "utf-8"));
  } catch {
  }
  return {};
}
function savePlayersStore(store) {
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2));
  } catch {
  }
}
function fetchPlayers(appId) {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  const now = Date.now();
  const store = loadPlayersStore();
  const cached = store[appId];
  if (cached && cached.data && now - cached.lastUpdated < FETCH_COOLDOWN) {
    console.log(`[players] Serving cached data for ${appId}`);
    win?.webContents.send("steam-players-update", { appId, players: cached.data });
    return;
  }
  if (win) {
    win.addBrowserView(backgroundView);
    backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
  const url = `https://partner.steampowered.com/app/players/${appId}/`;
  console.log(`[players] Fetching ${url}`);
  backgroundView.webContents.removeAllListeners("did-finish-load");
  backgroundView.webContents.loadURL(url);
  backgroundView.webContents.once("did-finish-load", () => {
    setTimeout(async () => {
      try {
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
        const allHistoryHref = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const links = Array.from(document.querySelectorAll('a'))
            const el = links.find(a => /all.{0,5}history/i.test((a.textContent || '').trim()))
            return el ? el.href : null
          })()
        `);
        if (allHistoryHref) {
          console.log(`[players] Navigating to All History: ${allHistoryHref}`);
          backgroundView.webContents.removeAllListeners("did-finish-load");
          backgroundView.webContents.loadURL(allHistoryHref);
          await new Promise((resolve) => backgroundView.webContents.once("did-finish-load", resolve));
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          console.log("[players] All History link not found, scraping default page");
        }
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
        const result = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const getText = (el) => (el ? (el.innerText || el.textContent || '').trim() : '')
            const parseNum = (s) => parseInt((s || '').replace(/[^0-9]/g, '')) || 0

            // Summary stats from tables
            let currentPlayers = 0, lifetimeAvgDAU = 0, recentAvgDAU = 0
            let avgPeakConcurrent = 0, maxPeakConcurrent = 0, avgDAU = 0, maxDAU = 0
            let avgSteamDeck = 0, maxSteamDeck = 0

            for (const row of document.querySelectorAll('table tr')) {
              const tds = row.querySelectorAll('td')
              if (tds.length < 2) continue
              const label = getText(tds[0]).toLowerCase()
              // Find rightmost non-empty td (All History column)
              let valTd = null
              for (let i = tds.length - 1; i >= 1; i--) {
                const t = getText(tds[i])
                if (t && /\\d/.test(t)) { valTd = tds[i]; break }
              }
              if (!valTd) continue
              const val = parseNum(getText(valTd))
              if (label.includes('current players')) currentPlayers = val
              else if (label.includes('lifetime avg daily active')) lifetimeAvgDAU = val
              else if (label.includes('recent avg daily active')) recentAvgDAU = val
              else if (label.includes('average daily peak concurrent')) avgPeakConcurrent = val
              else if (label.includes('maximum daily peak concurrent')) maxPeakConcurrent = val
              else if (label.includes('average daily active users')) avgDAU = val
              else if (label.includes('maximum daily active users')) maxDAU = val
              else if (label.includes('average daily steam deck')) avgSteamDeck = val
              else if (label.includes('maximum daily steam deck')) maxSteamDeck = val
            }

            // Extract time series from inline <script> tags
            let peakConcurrent = []
            let dailyActive = []
            for (const script of document.querySelectorAll('script')) {
              const text = script.textContent || ''
              if (!text.includes("'user_graph'")) continue
              // Find start of data array after 'user_graph' ,
              const marker = text.indexOf("'user_graph'")
              if (marker < 0) continue
              const dataStart = text.indexOf('[', marker + 12)
              if (dataStart < 0) continue
              // Match balanced brackets to get full data array
              let depth = 0, endIdx = dataStart
              for (let i = dataStart; i < text.length; i++) {
                if (text[i] === '[') depth++
                else if (text[i] === ']') { depth--; if (depth === 0) { endIdx = i; break } }
              }
              try {
                const parsed = JSON.parse(text.slice(dataStart, endIdx + 1))
                if (Array.isArray(parsed) && parsed.length >= 2) {
                  peakConcurrent = parsed[0].map(p => ({ date: p[0], value: p[1] }))
                  dailyActive = parsed[1].map(p => ({ date: p[0], value: p[1] }))
                }
              } catch (e) { /* parse failed */ }
              break
            }

            return { currentPlayers, lifetimeAvgDAU, recentAvgDAU, avgPeakConcurrent, maxPeakConcurrent, avgDAU, maxDAU, avgSteamDeck, maxSteamDeck, peakConcurrent, dailyActive }
          })()
        `);
        if (!result) {
          console.error("[players] Failed to parse players page for", appId);
          return;
        }
        const data = {
          summary: {
            currentPlayers: result.currentPlayers,
            lifetimeAvgDAU: result.lifetimeAvgDAU,
            recentAvgDAU: result.recentAvgDAU,
            avgPeakConcurrent: result.avgPeakConcurrent,
            maxPeakConcurrent: result.maxPeakConcurrent,
            avgDAU: result.avgDAU,
            maxDAU: result.maxDAU,
            avgSteamDeck: result.avgSteamDeck,
            maxSteamDeck: result.maxSteamDeck
          },
          peakConcurrent: result.peakConcurrent || [],
          dailyActive: result.dailyActive || []
        };
        store[appId] = { lastUpdated: Date.now(), data };
        savePlayersStore(store);
        console.log(`[players] Saved for ${appId}: peak=${data.summary.maxPeakConcurrent} maxDAU=${data.summary.maxDAU} series=${data.peakConcurrent.length}pts`);
        win?.webContents.send("steam-players-update", { appId, players: data });
      } catch (e) {
        console.error("[players] Error:", e);
      }
    }, 2e3);
  });
}
function loadPortfolioCache(filePath) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
  }
  return null;
}
function savePortfolioCache(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify({ lastUpdated: Date.now(), ...data }, null, 2));
  } catch {
  }
}
function loadHistoryStore() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load history store:", e);
  }
  return {};
}
function saveHistoryStore(store) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("Failed to save history store:", e);
  }
}
function loadWishlistStore() {
  try {
    if (fs.existsSync(WISHLIST_FILE)) {
      const raw = fs.readFileSync(WISHLIST_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load wishlist store:", e);
  }
  return {};
}
function saveWishlistStore(store) {
  try {
    fs.writeFileSync(WISHLIST_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("Failed to save wishlist store:", e);
  }
}
function fetchHistory(appId) {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  const now = Date.now();
  const store = loadHistoryStore();
  const appHistory = store[appId];
  if (appHistory && appHistory.data.length > 0) {
    console.log(`Sending cached history for ${appId} (${appHistory.data.length} records)`);
    win?.webContents.send("steam-history-update", { appId, history: appHistory.data });
    if (appHistory.lastUpdated && now - appHistory.lastUpdated < FETCH_COOLDOWN) {
      console.log(`Skipping history fetch for ${appId} (cached & fresh) — triggering downstream fetches`);
      fetchWishlist(appId);
      return;
    }
  }
  console.log(`Starting history fetch for ${appId}...`);
  win?.webContents.send("steam-history-fetching", appId);
  const dateStart = "2000-01-01";
  const dateEnd = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const appDetailsUrl = `https://partner.steampowered.com/app/details/${appId}/?dateStart=${dateStart}&dateEnd=${dateEnd}`;
  if (!win) return;
  backgroundView.webContents.removeAllListeners("did-finish-load");
  win.addBrowserView(backgroundView);
  backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 });
  console.log(`[history] Loading app details page: ${appDetailsUrl}`);
  backgroundView.webContents.loadURL(appDetailsUrl);
  backgroundView.webContents.once("did-finish-load", async () => {
    await new Promise((r) => setTimeout(r, 2500));
    if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
    try {
      const result = await backgroundView.webContents.executeJavaScript(`
                (async function() {
                    function isValidCsv(text) {
                        if (!text || text.length < 50) return false;
                        if (/<!DOCTYPE|<html/i.test(text)) return false;
                        return /\\d{4}-\\d{2}-\\d{2}/.test(text) || text.split('\\n').length > 3;
                    }

                    // Find the form that posts to report_csv.php (the "view as csv" button)
                    var allForms = Array.from(document.querySelectorAll('form'));
                    var csvForm = allForms.find(function(f) {
                        return (f.action || '').includes('report_csv');
                    });
                    // Also try: find by submit button text
                    if (!csvForm) {
                        var btns = Array.from(document.querySelectorAll('input[type="submit"], button'));
                        for (var btn of btns) {
                            var label = (btn.value || btn.textContent || '').toLowerCase();
                            if (label.includes('csv') || label.includes('download')) {
                                csvForm = btn.closest('form');
                                if (csvForm) break;
                            }
                        }
                    }

                    if (!csvForm) {
                        // Log what forms exist for debugging
                        var formInfo = allForms.map(function(f) {
                            return { action: f.action, inputs: f.querySelectorAll('input[name]').length };
                        });
                        return { error: 'form_not_found', formsCount: allForms.length, formInfo: formInfo };
                    }

                    // Serialize all form fields
                    var inputs = csvForm.querySelectorAll('input[name], select[name], textarea[name]');
                    var bodyParts = [];
                    for (var i = 0; i < inputs.length; i++) {
                        var el = inputs[i];
                        if (!el.name) continue;
                        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue;
                        bodyParts.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value || ''));
                    }
                    var body = bodyParts.join('&');

                    var res = await fetch(csvForm.action || 'https://partner.steampowered.com/report_csv.php', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: body
                    });
                    var text = await res.text();
                    if (res.ok && isValidCsv(text)) return { csv: text };
                    return { error: 'post_failed', status: res.status, preview: text.slice(0, 300), bodyLen: body.length, body: body.slice(0, 200) };
                })()
            `);
      const csvText = result && typeof result.csv === "string" ? result.csv : null;
      if (csvText && csvText.length > 100) {
        console.log(`[history] CSV fetched for ${appId}, ${csvText.length} chars.`);
        processHistoryCSVContent(appId, csvText);
      } else if (result?.error === "form_not_found") {
        console.error(`[history] Form not found on page for ${appId} (demo/playtest/no sales). forms=${result.formsCount}`, result.formInfo);
        win?.webContents.send("steam-history-no-data", { appId });
      } else {
        console.error(`[history] POST failed for ${appId}. status=${result?.status}`);
        if (result?.body) console.error(`[history] sent body: ${result.body}`);
        if (result?.preview) console.error(`[history] response preview: ${JSON.stringify(result.preview.slice(0, 200))}`);
      }
    } catch (e) {
      console.error("[history] CSV fetch error:", e);
    }
    fetchWishlist(appId);
  });
}
function processHistoryCSVContent(appId, fileContent) {
  try {
    const lines = fileContent.split("\n");
    let headerIndex = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].toLowerCase().includes("date") && lines[i].toLowerCase().includes("units")) {
        headerIndex = i;
        break;
      }
    }
    const cleanContent = lines.slice(headerIndex).join("\n");
    const records = parse(cleanContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    const newHistory = [];
    if (records.length > 0) {
      const keys = Object.keys(records[0]);
      const dateKey = keys.find((k) => k.toLowerCase().includes("date"));
      const unitsKey = keys.find((k) => k.toLowerCase().includes("total units") || k.toLowerCase().includes("units"));
      if (dateKey && unitsKey) {
        for (const row of records) {
          const dateStr = row[dateKey];
          const unitsStr = row[unitsKey];
          if (dateStr && unitsStr) {
            const val = parseInt(unitsStr.replace(/,/g, "")) || 0;
            let formattedDate = dateStr;
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              formattedDate = parsedDate.toISOString().split("T")[0];
            }
            newHistory.push({ date: formattedDate, value: val });
          }
        }
      }
    }
    newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const store = loadHistoryStore();
    store[appId] = { lastUpdated: Date.now(), data: newHistory };
    saveHistoryStore(store);
    console.log(`Processed ${newHistory.length} history records for ${appId} (from fetch).`);
    win?.webContents.send("steam-history-update", { appId, history: newHistory });
  } catch (e) {
    console.error("Error processing history CSV content:", e);
  }
}
function fetchWishlist(appId) {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  const now = Date.now();
  const store = loadWishlistStore();
  const appWishlist = store[appId];
  if (appWishlist && appWishlist.data.length > 0) {
    win?.webContents.send("steam-wishlist-update", { appId, wishlist: appWishlist.data, currentOutstanding: appWishlist.currentOutstanding ?? null });
    if (appWishlist.lastUpdated && now - appWishlist.lastUpdated < FETCH_COOLDOWN) {
      console.log(`Skipping wishlist fetch for ${appId} (cached & fresh) — triggering playtime/players`);
      fetchPlaytime(appId);
      return;
    }
  }
  console.log(`Starting wishlist fetch for ${appId}...`);
  if (win) {
    win.addBrowserView(backgroundView);
    backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
  const requestToken = ++activeWishlistDownloadToken;
  const wishlistPageUrl = `https://partner.steampowered.com/app/wishlist/${appId}/`;
  backgroundView.webContents.loadURL(wishlistPageUrl);
  backgroundView.webContents.once("did-finish-load", async () => {
    setTimeout(async () => {
      try {
        if (!backgroundView || backgroundView.webContents.isDestroyed()) {
          return;
        }
        if (requestToken !== activeWishlistDownloadToken) return;
        const meta = await backgroundView.webContents.executeJavaScript(`
                    (function() {
                        const normalize = (v) => {
                            const raw = (v || '').trim()
                            if (!raw) return null
                            if (/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return raw
                            const parsed = new Date(raw)
                            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
                            return null
                        }
                        const parseNum = (v) => {
                            const text = (v || '').trim()
                            if (!text) return null
                            const cleaned = text.replace(/[(),]/g, '')
                            const n = parseInt(cleaned, 10)
                            if (Number.isNaN(n)) return null
                            return text.startsWith('(') && text.endsWith(')') ? -n : n
                        }
                        let firstDate = null
                        let currentOutstanding = null
                        const rows = Array.from(document.querySelectorAll('tr'))
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td')
                            if (cells.length < 2) continue
                            const label = (cells[0].innerText || '').trim().toLowerCase()
                            if (label.includes('date first wishlisted')) {
                                firstDate = normalize(cells[1].innerText)
                            }
                            if (label.includes('current outstanding wishes')) {
                                currentOutstanding = parseNum(cells[1].innerText)
                            }
                        }
                        if (currentOutstanding === null) {
                            const text = document.body?.innerText || ''
                            const match = text.match(/current outstanding wishes[^0-9]*([0-9][0-9,]*)/i)
                            if (match && match[1]) {
                                currentOutstanding = parseInt(match[1].replace(/,/g, ''), 10)
                            }
                        }
                        return { firstDate, currentOutstanding }
                    })()
                `);
        console.log(`[wishlist] Meta for ${appId}:`, meta);
        if (!meta?.firstDate && (meta?.currentOutstanding === 0 || meta?.currentOutstanding === null)) {
          console.log(`[wishlist] No wishlist data for ${appId}, skipping CSV download`);
          win?.webContents.send("steam-wishlist-update", { appId, wishlist: [], currentOutstanding: 0, noData: true });
          fetchPlaytime(appId);
          return;
        }
        const dateStart = meta?.firstDate || "2000-01-01";
        const dateEnd = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const csvUrl = `https://partner.steampowered.com/report_csv.php?file=SteamWishlists_${appId}_${dateStart}_to_${dateEnd}&params=query=QueryWishlistActionsForCSV^appID=${appId}^dateStart=${dateStart}^dateEnd=${dateEnd}^interpreter=WishlistReportInterpreter`;
        console.log(`[wishlist] CSV URL for ${appId}: ${csvUrl}`);
        const csvText = await backgroundView.webContents.executeJavaScript(`
                    (async function() {
                        const response = await fetch(${JSON.stringify(csvUrl)}, { credentials: 'include' })
                        if (!response.ok) return ''
                        return await response.text()
                    })()
                `);
        if (requestToken !== activeWishlistDownloadToken) return;
        processWishlistCSVContent(appId, csvText || "", meta?.currentOutstanding ?? null);
        fetchPlaytime(appId);
      } catch (e) {
        console.error("Failed to trigger wishlist csv download:", e);
        fetchPlaytime(appId);
      }
    }, 2e3);
  });
}
function processWishlistCSVContent(appId, fileContent, currentOutstanding) {
  try {
    const existing = loadWishlistStore()[appId];
    const effectiveOutstandingFromCache = existing?.currentOutstanding ?? null;
    const resolvedOutstanding = currentOutstanding ?? effectiveOutstandingFromCache;
    if (!fileContent || fileContent.includes("Steamworks Product Data login")) {
      win?.webContents.send("steam-wishlist-update", { appId, wishlist: [], currentOutstanding: resolvedOutstanding });
      return;
    }
    const lines = fileContent.split(/\r?\n/).map((l) => l.trimEnd());
    let delimiter = ",";
    if (lines[0] && lines[0].toLowerCase().startsWith("sep=")) {
      delimiter = lines[0].slice(4).trim() || ",";
    }
    let headerIndex = -1;
    for (let i = 0; i < Math.min(60, lines.length); i++) {
      const line = lines[i].toLowerCase();
      const hasDate = line.includes("date") || line.includes("datelocal");
      const hasAdds = line.includes("add") || line.includes("adds");
      const hasDeletes = line.includes("delet") || line.includes("deletes");
      if (hasDate && (hasAdds || hasDeletes || line.includes("wishlist") || line.includes("outstanding") || line.includes("balance"))) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) {
      console.error(`[wishlist] Header not found for ${appId}. Preview:`, lines.slice(0, 8).join(" | "));
      win?.webContents.send("steam-wishlist-update", { appId, wishlist: [], currentOutstanding: resolvedOutstanding });
      return;
    }
    const cleanContent = lines.slice(headerIndex).join("\n");
    const records = parse(cleanContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
      relax_column_count: true,
      skip_records_with_error: true
    });
    const parseMetric = (raw) => {
      if (!raw) return 0;
      const text = raw.trim();
      if (!text) return 0;
      const negative = text.startsWith("(") && text.endsWith(")");
      const cleaned = text.replace(/[(),]/g, "");
      const value = parseInt(cleaned, 10) || 0;
      return negative ? -value : value;
    };
    const result = [];
    if (records.length > 0) {
      const keys = Object.keys(records[0]);
      const dateKey = keys.find((k) => k.toLowerCase().includes("date"));
      const additionsKey = keys.find((k) => k.toLowerCase().includes("add"));
      const deletionsKey = keys.find((k) => k.toLowerCase().includes("delet"));
      const purchasesKey = keys.find((k) => k.toLowerCase().includes("purchase"));
      const giftsKey = keys.find((k) => k.toLowerCase().includes("gift"));
      const balanceKey = keys.find((k) => k.toLowerCase().includes("outstanding") || k.toLowerCase().includes("balance"));
      const netKey = keys.find((k) => k.toLowerCase().includes("net"));
      if (dateKey) {
        for (const row of records) {
          const dateRaw = row[dateKey];
          const parsedDate = new Date(dateRaw);
          if (isNaN(parsedDate.getTime())) continue;
          const date = parsedDate.toISOString().split("T")[0];
          const additions = Math.abs(parseMetric(additionsKey ? row[additionsKey] : void 0));
          const deletions = -Math.abs(parseMetric(deletionsKey ? row[deletionsKey] : void 0));
          const purchases = -Math.abs(parseMetric(purchasesKey ? row[purchasesKey] : void 0));
          const gifts = -Math.abs(parseMetric(giftsKey ? row[giftsKey] : void 0));
          const balance = parseMetric(balanceKey ? row[balanceKey] : void 0);
          const net2 = netKey ? parseMetric(row[netKey]) : additions + deletions + purchases + gifts;
          result.push({ date, additions, deletions, purchases, gifts, balance, net: net2 });
        }
      }
    }
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (result.length > 0) {
      let cumulative = 0;
      for (const point of result) {
        cumulative += point.net;
        point.balance = cumulative;
      }
      const lastFromCsv = result[result.length - 1].balance;
      const anchorOutstanding = resolvedOutstanding ?? (lastFromCsv > 0 ? lastFromCsv : null);
      if (anchorOutstanding !== null) {
        const offset = anchorOutstanding - result[result.length - 1].balance;
        for (const point of result) {
          point.balance += offset;
        }
      }
    }
    const store = loadWishlistStore();
    const finalOutstanding = resolvedOutstanding ?? (result.length > 0 ? result[result.length - 1].balance : null);
    store[appId] = { lastUpdated: Date.now(), data: result, currentOutstanding: finalOutstanding };
    saveWishlistStore(store);
    win?.webContents.send("steam-wishlist-update", { appId, wishlist: result, currentOutstanding: finalOutstanding });
  } catch (e) {
    console.error("Error processing wishlist CSV:", e);
  }
}
const PORTFOLIO_SCRAPE_SCRIPT = `
  (function() {
    try {
      const data = { type: 'portfolio', games: [], _debug: {} };
      const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
      const rows = Array.from(document.querySelectorAll('tr'));
      const findStat = (labelPattern) => {
        for (const row of rows) {
          if (row.innerText.match(labelPattern)) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) return cells[cells.length - 1].innerText.trim();
          }
        }
        return null;
      };
      data.lifetimeRevenue = findStat(/Lifetime revenue/i);
      data.steamUnits = findStat(/Steam units/i);
      data.retailActivations = findStat(/retail activations/i);
      data.totalUnits = findStat(/lifetime units total/i) || findStat(/Total units/i);
      const companyHeader = document.querySelector('h2');
      if (companyHeader && companyHeader.innerText.includes('Steam Stats')) {
        data.title = companyHeader.innerText.replace('Steam Stats - ', '').trim();
      }
      let unitsColIndex = -1, rankColIndex = -1;
      const headerRow = Array.from(document.querySelectorAll('tr')).find(r =>
        r.innerText.toLowerCase().includes('rank') && (r.innerText.toLowerCase().includes('units') || r.innerText.toLowerCase().includes('product'))
      ) || rows[0];
      // Collect ALL header cell texts for debugging
      const allHeaderTexts = [];
      if (headerRow) {
        const cells = headerRow.querySelectorAll('th, td');
        for (let i = 0; i < cells.length; i++) {
          const text = cells[i].innerText.toLowerCase().trim();
          allHeaderTexts.push(text);
          if (text.includes('rank')) rankColIndex = i;
          // Broaden match: any column that contains 'units' (not just with 'current'/'today')
          if (text.includes('units')) {
            // Prefer columns specifically mentioning today/current; otherwise take any units col as fallback
            if (unitsColIndex === -1 || text.includes('current') || text.includes('today')) unitsColIndex = i;
          }
        }
      }
      data._debug = { allHeaderTexts, unitsColIndex, rankColIndex, pageUrl: location.href };
      for (const row of rows) {
        const link = row.querySelector('a[href*="/app/details/"]');
        const cells = row.querySelectorAll('td');
        if (link && cells.length >= 3) {
          const name = cleanText(link.innerText);
          const href = link.getAttribute('href');
          const appIdMatch = href.match(/app\\/details\\/(\\d+)/);
          const appId = appIdMatch ? appIdMatch[1] : null;
          if (appId) {
            let rank = '0', units = '0';
            if (unitsColIndex > -1 && cells[unitsColIndex]) units = cleanText(cells[unitsColIndex].innerText);
            if (rankColIndex > -1 && cells[rankColIndex]) rank = cleanText(cells[rankColIndex].innerText);
            if (units === '0' && rank === '0') {
              const linkParentCell = link.closest('td');
              if (linkParentCell) {
                const cellIndex = Array.from(row.children).indexOf(linkParentCell);
                if (cellIndex > -1) {
                  if (cells[cellIndex + 1]) rank = cleanText(cells[cellIndex + 1].innerText);
                  if (cells[cellIndex + 2]) units = cleanText(cells[cellIndex + 2].innerText);
                }
              }
            }
            data.games.push({ name, appId, rank, units });
          }
        }
      }
      return data;
    } catch (e) {
      return { error: e.message };
    }
  })()
`;
async function scrapePortfolioFromWebContents(webContents) {
  try {
    const result = await webContents.executeJavaScript(PORTFOLIO_SCRAPE_SCRIPT);
    if (result && result._debug) {
      console.log("[portfolio-scrape] pageUrl:", result._debug.pageUrl);
      console.log("[portfolio-scrape] header cols:", JSON.stringify(result._debug.allHeaderTexts));
      console.log("[portfolio-scrape] unitsColIndex:", result._debug.unitsColIndex, "| rankColIndex:", result._debug.rankColIndex);
      if (result.games?.length > 0) {
        const preview = result.games.slice(0, 3).map((g) => `${g.name}: ${g.units}`).join(", ");
        console.log("[portfolio-scrape] first 3 games:", preview);
      }
    }
    return result && !result.error ? result : null;
  } catch (e) {
    console.error("Portfolio scrape from webContents failed:", e);
    return null;
  }
}
async function fetchPortfolioToday() {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  if (!win) return;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const todayUrl = `${STEAM_ALL_APPS_URL}?dateStart=${today}&dateEnd=${today}`;
  const cache = loadPortfolioCache(PORTFOLIO_TODAY_FILE);
  const cacheDate = cache?.lastUpdated ? new Date(cache.lastUpdated).toISOString().split("T")[0] : null;
  const cacheIsToday = cacheDate === today;
  if (cache && cache.games?.length > 0 && cacheIsToday) {
    console.log(`[portfolio-today] Sending cached today data (${cache.games.length} games)`);
    win.webContents.send("steam-data-update", { type: "portfolio", games: cache.games, title: cache.title, totalUnits: cache.totalUnits });
    if (cache.lastUpdated && Date.now() - cache.lastUpdated < FETCH_COOLDOWN) {
      console.log("[portfolio-today] Cache is fresh, skipping fetch");
      return;
    }
  }
  console.log(`[portfolio-today] Fetching fresh Today data (${today}) from background...`);
  console.log(`[portfolio-today] Loading URL: ${todayUrl}`);
  backgroundView.webContents.removeAllListeners("did-finish-load");
  win.addBrowserView(backgroundView);
  backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 });
  backgroundView.webContents.openDevTools({ mode: "detach" });
  backgroundView.webContents.loadURL(todayUrl);
  backgroundView.webContents.once("did-finish-load", async () => {
    await new Promise((r) => setTimeout(r, 1500));
    if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
    const result = await scrapePortfolioFromWebContents(backgroundView.webContents);
    if (win && !win.webContents.isDestroyed() && result && result.games?.length > 0) {
      savePortfolioCache(PORTFOLIO_TODAY_FILE, { games: result.games, title: result.title, totalUnits: result.totalUnits });
      win.webContents.send("steam-data-update", { type: "portfolio", games: result.games, title: result.title, totalUnits: result.totalUnits });
      console.log(`[portfolio-today] Fetched ${result.games.length} games`);
    }
    backgroundView?.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  });
}
async function fetchPortfolioAllHistory() {
  if (!backgroundView) {
    createBackgroundView();
    if (!backgroundView) return;
  }
  if (!win) return;
  const cache = loadPortfolioCache(PORTFOLIO_ALLHISTORY_FILE);
  if (cache && cache.games?.length > 0) {
    console.log(`[portfolio-allhistory] Sending cached data (${cache.games.length} games)`);
    win.webContents.send("steam-portfolio-all-history", { games: cache.games, title: cache.title, totalUnits: cache.totalUnits });
    if (cache.lastUpdated && Date.now() - cache.lastUpdated < FETCH_COOLDOWN) {
      console.log("[portfolio-allhistory] Cache is fresh, skipping fetch");
      return;
    }
  }
  console.log("[portfolio-allhistory] Fetching fresh All History data from background...");
  backgroundView.webContents.removeAllListeners("did-finish-load");
  win.addBrowserView(backgroundView);
  backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 });
  const dateEnd = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  backgroundView.webContents.loadURL(`${STEAM_ALL_APPS_URL}?dateStart=2000-01-01&dateEnd=${dateEnd}`);
  backgroundView.webContents.once("did-finish-load", async () => {
    await new Promise((r) => setTimeout(r, 1500));
    if (!backgroundView || backgroundView.webContents.isDestroyed()) return;
    const result = await scrapePortfolioFromWebContents(backgroundView.webContents);
    if (win && !win.webContents.isDestroyed() && result && result.games?.length > 0) {
      savePortfolioCache(PORTFOLIO_ALLHISTORY_FILE, { games: result.games, title: result.title, totalUnits: result.totalUnits });
      win.webContents.send("steam-portfolio-all-history", { games: result.games, title: result.title, totalUnits: result.totalUnits });
      console.log(`[portfolio-allhistory] Fetched ${result.games.length} games`);
    }
    backgroundView?.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  });
}
async function scrapeData() {
  if (!steamView) return;
  const currentUrl = steamView.webContents.getURL();
  const appIdMatch = currentUrl.match(/app\/details\/(\d+)/);
  const appId = appIdMatch ? appIdMatch[1] : null;
  const code = `
    (function() {
      try {
        const data = {};
        
        // Helper to clean and parse text
        const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
        
        // Get all rows
        const rows = Array.from(document.querySelectorAll('tr'));
        
        function findRowValue(label, parentElement = document) {
            // Search within a specific parent if provided, otherwise document
            const searchRows = parentElement === document ? rows : Array.from(parentElement.querySelectorAll('tr'));
            
            for (const row of searchRows) {
                if (row.innerText.includes(label)) {
                    const cells = row.querySelectorAll('td');
                    // Usually the value is the last cell or the one to the right
                    // For the top table, it's often the 2nd column (index 1) if label is index 0
                    // But 'Wishlists' has '48,197 + (view...)'
                    
                    // Let's try to find the cell that contains a number or $
                    for (let i = 0; i < cells.length; i++) {
                        const text = cells[i].innerText;
                        // Skip if it's the label itself
                        if (text.includes(label)) continue;
                        
                        // If it has digits, it's likely the value
                        if (/[0-9]/.test(text)) {
                            return cleanText(text);
                        }
                    }
                    
                    // Fallback: return the last cell
                    if (cells.length > 0) return cleanText(cells[cells.length - 1].innerText);
                }
            }
            return null;
        }

        // --- Lifetime Data (Top Table) ---
        // Usually the first table or main section
        data.lifetimeRevenueGross = findRowValue('Lifetime Steam revenue (gross)');
        data.lifetimeRevenueNet = findRowValue('Lifetime Steam revenue (net)');
        data.lifetimeUnits = findRowValue('Lifetime Steam units');
        data.wishlists = findRowValue('Wishlists');
        data.dailyActiveUsers = findRowValue('Daily active users');
        data.currentPlayers = findRowValue('Current players');

        // --- Today's Data (Bottom Table) ---
        // Look for the "Today" section. 
        // Strategy: Find the text "View most recent: today" and look at the table immediately following it.
        
        let todaySection = null;
        const allDivs = Array.from(document.querySelectorAll('div, span, td')); // Broad search for the anchor text
        for (const el of allDivs) {
            if (el.innerText && el.innerText.includes('View most recent:') && el.innerText.includes('today')) {
                // The table should be following this element
                // Go up to a container and find the next table? 
                // Or maybe it's just the next sibling?
                let next = el.nextElementSibling;
                while (next) {
                    if (next.tagName === 'TABLE') {
                        todaySection = next;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                
                // If not found as sibling, maybe el is inside a wrapper, so check parent's siblings
                if (!todaySection && el.parentElement) {
                     let parentNext = el.parentElement.nextElementSibling;
                     while (parentNext) {
                        if (parentNext.tagName === 'TABLE') {
                            todaySection = parentNext;
                            break;
                        }
                        parentNext = parentNext.nextElementSibling;
                     }
                }
                if (todaySection) break;
            }
        }
        
        if (todaySection) {
            data.todayRevenue = findRowValue('Steam revenue', todaySection);
            data.todayUnits = findRowValue('Steam units', todaySection);
        } else {
            // Fallback: Try to find rows that strictly start with "Steam revenue" but appearing later in the DOM?
            // Or look for a table with "Today" in the header?
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                if (table.innerText.includes('Today')) {
                     data.todayRevenue = findRowValue('Steam revenue', table);
                     data.todayUnits = findRowValue('Steam units', table);
                     // If we found something, break
                     if (data.todayRevenue) break;
                }
            }
        }

        // Game Title
        // Strategy: Look for the h2 element that starts with "Game:"
        const h2s = Array.from(document.querySelectorAll('h2, h1')); // Look for h1 too
        const titleEl = h2s.find(el => el.innerText.trim().startsWith('Game:'));
        if (titleEl) {
             // Extract just the name "Iron Core: Mech Survivor" from "Game: Iron Core: Mech Survivor (3586420)"
             let text = titleEl.innerText.trim();
             // Remove "Game: " prefix
             if (text.startsWith('Game:')) {
                 text = text.slice(5).trim();
             }
             // Remove App ID suffix "(3586420)"
             const appSuffixStart = text.lastIndexOf(' (');
             if (appSuffixStart > -1 && text.endsWith(')')) {
                 text = text.slice(0, appSuffixStart).trim();
             }
             data.title = cleanText(text);
        } else {
             // Fallback to document title or other selector
             const appNameEl = document.querySelector('.app_name'); // Sometimes used in Steamworks
             if (appNameEl) data.title = cleanText(appNameEl.innerText);
        }

        return data;
      } catch (e) {
        return { error: e.message };
      }
    })()
  `;
  try {
    const result = await steamView.webContents.executeJavaScript(code);
    if (appId) {
      result.appId = appId;
    }
    console.log("Scraped Data:", result);
    win?.webContents.send("steam-data-update", result);
  } catch (e) {
    console.error("Scraping failed:", e);
  }
}
electron.ipcMain.on("navigate-to-app", (_event, appId) => {
  if (!steamView) return;
  const url = `https://partner.steampowered.com/app/details/${appId}/`;
  console.log(`Navigating to app: ${appId} -> ${url}`);
  steamView.webContents.loadURL(url);
});
electron.ipcMain.on("navigate-to-portfolio", () => {
  if (!steamView) return;
  console.log(`Navigating back to portfolio: ${STEAM_ALL_APPS_URL}`);
  steamView.webContents.loadURL(STEAM_ALL_APPS_URL);
});
electron.ipcMain.on("logout", () => {
  if (!steamView) return;
  const logoutUrl = "https://partner.steampowered.com/login/logout";
  console.log(`Logging out -> ${logoutUrl}`);
  setDashboardVisibility(false);
  steamView.webContents.loadURL(logoutUrl);
});
electron.ipcMain.on("toggle-dashboard", (_event, show) => {
  setDashboardVisibility(show);
});
electron.ipcMain.on("request-visibility-state", () => {
  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send("dashboard-visibility", dashboardActive);
  }
});
electron.ipcMain.on("request-initial-data", () => {
  if (!steamView || steamView.webContents.isDestroyed()) return;
  const url = steamView.webContents.getURL();
  if (TARGET_URL_PATTERN.test(url)) {
    scrapeData();
  } else if (ALL_PRODUCTS_PATTERN.test(url)) {
    fetchPortfolioToday();
  }
});
electron.ipcMain.on("retry-history-fetch", (_event, appId) => {
  let targetAppId = appId;
  if (!targetAppId && steamView && !steamView.webContents.isDestroyed()) {
    const url = steamView.webContents.getURL();
    const match = url.match(/app\/details\/(\d+)/);
    if (match) targetAppId = match[1];
  }
  if (targetAppId) {
    fetchHistory(targetAppId);
  }
});
electron.ipcMain.on("request-portfolio-all-history", () => {
  fetchPortfolioAllHistory();
});
function setDashboardVisibility(show) {
  dashboardActive = show;
  if (!win || !steamView || steamView.webContents.isDestroyed()) return;
  if (show) {
    steamView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    if (!win.webContents.isDestroyed()) {
      win.webContents.send("dashboard-visibility", true);
    }
  } else {
    const bounds = win.getContentBounds();
    steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    if (!win.webContents.isDestroyed()) {
      win.webContents.send("dashboard-visibility", false);
    }
  }
}
let autoRefreshInterval = null;
function startAutoRefresh() {
  if (autoRefreshInterval) return;
  console.log("Starting auto-refresh loop (every 5 minutes)");
  autoRefreshInterval = setInterval(() => {
    console.log("Auto-refreshing data...");
    if (steamView && !steamView.webContents.isDestroyed()) {
      steamView.webContents.reloadIgnoringCache();
    } else {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }, 5 * 60 * 1e3);
}
electron.ipcMain.on("refresh-data", () => {
  console.log("Manual refresh requested");
  if (steamView) {
    steamView.webContents.reloadIgnoringCache();
  }
});
electron.ipcMain.on("toggle-fullscreen", () => {
  if (win && !win.isDestroyed()) {
    win.setFullScreen(!win.isFullScreen());
  }
});
electron.app.whenReady().then(() => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const todayCache = loadPortfolioCache(PORTFOLIO_TODAY_FILE);
  if (todayCache?.lastUpdated) {
    const cachedDate = new Date(todayCache.lastUpdated).toISOString().split("T")[0];
    if (cachedDate !== today) {
      try {
        fs.unlinkSync(PORTFOLIO_TODAY_FILE);
      } catch {
      }
      console.log(`[portfolio-today] Cleared stale cache from ${cachedDate}`);
    }
  }
  createWindow();
  electron.globalShortcut.register("F11", () => {
    if (win && !win.isDestroyed()) {
      win.setFullScreen(!win.isFullScreen());
    }
  });
});
electron.app.on("window-all-closed", () => {
  electron.globalShortcut.unregisterAll();
  win = null;
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.ipcMain.handle("check-for-update", async () => {
  try {
    const RELEASES_URL = "https://github.com/the-super-engine/steam-sales-dashboard/tags";
    const currentVersion = electron.app.getVersion();
    console.log(`Checking for updates... Current version: ${currentVersion}`);
    const request = electron.net.request(RELEASES_URL);
    return new Promise((resolve) => {
      request.on("response", (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk.toString();
        });
        response.on("end", () => {
          const versionRegex = /v(\d+\.\d+\.\d+)/g;
          let match;
          let latestVersion = "0.0.0";
          while ((match = versionRegex.exec(body)) !== null) {
            const foundVersion = match[1];
            if (isVersionNewer(foundVersion, latestVersion)) {
              latestVersion = foundVersion;
            }
          }
          const hasUpdate = isVersionNewer(latestVersion, currentVersion);
          console.log(`Update check result: hasUpdate=${hasUpdate}, latest=${latestVersion}`);
          resolve({
            hasUpdate,
            latestVersion,
            currentVersion,
            releasesUrl: "https://github.com/the-super-engine/steam-sales-dashboard/releases"
          });
        });
      });
      request.on("error", (error) => {
        console.error("Update check failed:", error);
        resolve({ hasUpdate: false, error: error.message });
      });
      request.end();
    });
  } catch (e) {
    console.error("Update check error:", e);
    return { hasUpdate: false, error: e instanceof Error ? e.message : String(e) };
  }
});
function isVersionNewer(latest, current) {
  const parse2 = (s) => s.trim().split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse2(latest);
  const b = parse2(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
