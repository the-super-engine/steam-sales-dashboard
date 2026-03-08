"use strict";const v=require("electron"),k=require("path"),A=require("fs");class S extends Error{constructor(e,l,n,...i){Array.isArray(l)&&(l=l.join(" ").trim()),super(l),Error.captureStackTrace!==void 0&&Error.captureStackTrace(this,S),this.code=e;for(const s of i)for(const r in s){const o=s[r];this[r]=Buffer.isBuffer(o)?o.toString(n.encoding):o==null?o:JSON.parse(JSON.stringify(o))}}}const de=function(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)},se=function(t){const e=[];for(let l=0,n=t.length;l<n;l++){const i=t[l];if(i==null||i===!1)e[l]={disabled:!0};else if(typeof i=="string")e[l]={name:i};else if(de(i)){if(typeof i.name!="string")throw new S("CSV_OPTION_COLUMNS_MISSING_NAME",["Option columns missing name:",`property "name" is required at position ${l}`,"when column is an object literal"]);e[l]=i}else throw new S("CSV_INVALID_COLUMN_DEFINITION",["Invalid column definition:","expect a string or a literal object,",`got ${JSON.stringify(i)} at position ${l}`])}return e};class te{constructor(e=100){this.size=e,this.length=0,this.buf=Buffer.allocUnsafe(e)}prepend(e){if(Buffer.isBuffer(e)){const l=this.length+e.length;if(l>=this.size&&(this.resize(),l>=this.size))throw Error("INVALID_BUFFER_STATE");const n=this.buf;this.buf=Buffer.allocUnsafe(this.size),e.copy(this.buf,0),n.copy(this.buf,e.length),this.length+=e.length}else{const l=this.length++;l===this.size&&this.resize();const n=this.clone();this.buf[0]=e,n.copy(this.buf,1,0,l)}}append(e){const l=this.length++;l===this.size&&this.resize(),this.buf[l]=e}clone(){return Buffer.from(this.buf.slice(0,this.length))}resize(){const e=this.length;this.size=this.size*2;const l=Buffer.allocUnsafe(this.size);this.buf.copy(l,0,0,e),this.buf=l}toString(e){return e?this.buf.slice(0,this.length).toString(e):Uint8Array.prototype.slice.call(this.buf.slice(0,this.length))}toJSON(){return this.toString("utf8")}reset(){this.length=0}}const he=12,me=13,_e=10,ge=32,pe=9,we=function(t){return{bomSkipped:!1,bufBytesStart:0,castField:t.cast_function,commenting:!1,error:void 0,enabled:t.from_line===1,escaping:!1,escapeIsQuote:Buffer.isBuffer(t.escape)&&Buffer.isBuffer(t.quote)&&Buffer.compare(t.escape,t.quote)===0,expectedRecordLength:Array.isArray(t.columns)?t.columns.length:void 0,field:new te(20),firstLineToHeaders:t.cast_first_line_to_header,needMoreDataSize:Math.max(t.comment!==null?t.comment.length:0,...t.delimiter.map(e=>e.length),t.quote!==null?t.quote.length:0),previousBuf:void 0,quoting:!1,stop:!1,rawBuffer:new te(100),record:[],recordHasError:!1,record_length:0,recordDelimiterMaxLength:t.record_delimiter.length===0?0:Math.max(...t.record_delimiter.map(e=>e.length)),trimChars:[Buffer.from(" ",t.encoding)[0],Buffer.from("	",t.encoding)[0]],wasQuoting:!1,wasRowDelimiter:!1,timchars:[Buffer.from(Buffer.from([me],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([_e],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([he],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([ge],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([pe],"utf8").toString(),t.encoding)]}},be=function(t){return t.replace(/([A-Z])/g,function(e,l){return"_"+l.toLowerCase()})},ne=function(t){const e={};for(const n in t)e[be(n)]=t[n];if(e.encoding===void 0||e.encoding===!0)e.encoding="utf8";else if(e.encoding===null||e.encoding===!1)e.encoding=null;else if(typeof e.encoding!="string"&&e.encoding!==null)throw new S("CSV_INVALID_OPTION_ENCODING",["Invalid option encoding:","encoding must be a string or null to return a buffer,",`got ${JSON.stringify(e.encoding)}`],e);if(e.bom===void 0||e.bom===null||e.bom===!1)e.bom=!1;else if(e.bom!==!0)throw new S("CSV_INVALID_OPTION_BOM",["Invalid option bom:","bom must be true,",`got ${JSON.stringify(e.bom)}`],e);if(e.cast_function=null,e.cast===void 0||e.cast===null||e.cast===!1||e.cast==="")e.cast=void 0;else if(typeof e.cast=="function")e.cast_function=e.cast,e.cast=!0;else if(e.cast!==!0)throw new S("CSV_INVALID_OPTION_CAST",["Invalid option cast:","cast must be true or a function,",`got ${JSON.stringify(e.cast)}`],e);if(e.cast_date===void 0||e.cast_date===null||e.cast_date===!1||e.cast_date==="")e.cast_date=!1;else if(e.cast_date===!0)e.cast_date=function(n){const i=Date.parse(n);return isNaN(i)?n:new Date(i)};else if(typeof e.cast_date!="function")throw new S("CSV_INVALID_OPTION_CAST_DATE",["Invalid option cast_date:","cast_date must be true or a function,",`got ${JSON.stringify(e.cast_date)}`],e);if(e.cast_first_line_to_header=void 0,e.columns===!0)e.cast_first_line_to_header=void 0;else if(typeof e.columns=="function")e.cast_first_line_to_header=e.columns,e.columns=!0;else if(Array.isArray(e.columns))e.columns=se(e.columns);else if(e.columns===void 0||e.columns===null||e.columns===!1)e.columns=!1;else throw new S("CSV_INVALID_OPTION_COLUMNS",["Invalid option columns:","expect an array, a function or true,",`got ${JSON.stringify(e.columns)}`],e);if(e.group_columns_by_name===void 0||e.group_columns_by_name===null||e.group_columns_by_name===!1)e.group_columns_by_name=!1;else{if(e.group_columns_by_name!==!0)throw new S("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",["Invalid option group_columns_by_name:","expect an boolean,",`got ${JSON.stringify(e.group_columns_by_name)}`],e);if(e.columns===!1)throw new S("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",["Invalid option group_columns_by_name:","the `columns` mode must be activated."],e)}if(e.comment===void 0||e.comment===null||e.comment===!1||e.comment==="")e.comment=null;else if(typeof e.comment=="string"&&(e.comment=Buffer.from(e.comment,e.encoding)),!Buffer.isBuffer(e.comment))throw new S("CSV_INVALID_OPTION_COMMENT",["Invalid option comment:","comment must be a buffer or a string,",`got ${JSON.stringify(e.comment)}`],e);if(e.comment_no_infix===void 0||e.comment_no_infix===null||e.comment_no_infix===!1)e.comment_no_infix=!1;else if(e.comment_no_infix!==!0)throw new S("CSV_INVALID_OPTION_COMMENT",["Invalid option comment_no_infix:","value must be a boolean,",`got ${JSON.stringify(e.comment_no_infix)}`],e);const l=JSON.stringify(e.delimiter);if(Array.isArray(e.delimiter)||(e.delimiter=[e.delimiter]),e.delimiter.length===0)throw new S("CSV_INVALID_OPTION_DELIMITER",["Invalid option delimiter:","delimiter must be a non empty string or buffer or array of string|buffer,",`got ${l}`],e);if(e.delimiter=e.delimiter.map(function(n){if(n==null||n===!1)return Buffer.from(",",e.encoding);if(typeof n=="string"&&(n=Buffer.from(n,e.encoding)),!Buffer.isBuffer(n)||n.length===0)throw new S("CSV_INVALID_OPTION_DELIMITER",["Invalid option delimiter:","delimiter must be a non empty string or buffer or array of string|buffer,",`got ${l}`],e);return n}),e.escape===void 0||e.escape===!0?e.escape=Buffer.from('"',e.encoding):typeof e.escape=="string"?e.escape=Buffer.from(e.escape,e.encoding):(e.escape===null||e.escape===!1)&&(e.escape=null),e.escape!==null&&!Buffer.isBuffer(e.escape))throw new Error(`Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(e.escape)}`);if(e.from===void 0||e.from===null)e.from=1;else if(typeof e.from=="string"&&/\d+/.test(e.from)&&(e.from=parseInt(e.from)),Number.isInteger(e.from)){if(e.from<0)throw new Error(`Invalid Option: from must be a positive integer, got ${JSON.stringify(t.from)}`)}else throw new Error(`Invalid Option: from must be an integer, got ${JSON.stringify(e.from)}`);if(e.from_line===void 0||e.from_line===null)e.from_line=1;else if(typeof e.from_line=="string"&&/\d+/.test(e.from_line)&&(e.from_line=parseInt(e.from_line)),Number.isInteger(e.from_line)){if(e.from_line<=0)throw new Error(`Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(t.from_line)}`)}else throw new Error(`Invalid Option: from_line must be an integer, got ${JSON.stringify(t.from_line)}`);if(e.ignore_last_delimiters===void 0||e.ignore_last_delimiters===null)e.ignore_last_delimiters=!1;else if(typeof e.ignore_last_delimiters=="number")e.ignore_last_delimiters=Math.floor(e.ignore_last_delimiters),e.ignore_last_delimiters===0&&(e.ignore_last_delimiters=!1);else if(typeof e.ignore_last_delimiters!="boolean")throw new S("CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS",["Invalid option `ignore_last_delimiters`:","the value must be a boolean value or an integer,",`got ${JSON.stringify(e.ignore_last_delimiters)}`],e);if(e.ignore_last_delimiters===!0&&e.columns===!1)throw new S("CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS",["The option `ignore_last_delimiters`","requires the activation of the `columns` option"],e);if(e.info===void 0||e.info===null||e.info===!1)e.info=!1;else if(e.info!==!0)throw new Error(`Invalid Option: info must be true, got ${JSON.stringify(e.info)}`);if(e.max_record_size===void 0||e.max_record_size===null||e.max_record_size===!1)e.max_record_size=0;else if(!(Number.isInteger(e.max_record_size)&&e.max_record_size>=0))if(typeof e.max_record_size=="string"&&/\d+/.test(e.max_record_size))e.max_record_size=parseInt(e.max_record_size);else throw new Error(`Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(e.max_record_size)}`);if(e.objname===void 0||e.objname===null||e.objname===!1)e.objname=void 0;else if(Buffer.isBuffer(e.objname)){if(e.objname.length===0)throw new Error("Invalid Option: objname must be a non empty buffer");e.encoding===null||(e.objname=e.objname.toString(e.encoding))}else if(typeof e.objname=="string"){if(e.objname.length===0)throw new Error("Invalid Option: objname must be a non empty string")}else if(typeof e.objname!="number")throw new Error(`Invalid Option: objname must be a string or a buffer, got ${e.objname}`);if(e.objname!==void 0){if(typeof e.objname=="number"){if(e.columns!==!1)throw Error("Invalid Option: objname index cannot be combined with columns or be defined as a field")}else if(e.columns===!1)throw Error("Invalid Option: objname field must be combined with columns or be defined as an index")}if(e.on_record===void 0||e.on_record===null)e.on_record=void 0;else if(typeof e.on_record!="function")throw new S("CSV_INVALID_OPTION_ON_RECORD",["Invalid option `on_record`:","expect a function,",`got ${JSON.stringify(e.on_record)}`],e);if(e.on_skip!==void 0&&e.on_skip!==null&&typeof e.on_skip!="function")throw new Error(`Invalid Option: on_skip must be a function, got ${JSON.stringify(e.on_skip)}`);if(e.quote===null||e.quote===!1||e.quote==="")e.quote=null;else if(e.quote===void 0||e.quote===!0?e.quote=Buffer.from('"',e.encoding):typeof e.quote=="string"&&(e.quote=Buffer.from(e.quote,e.encoding)),!Buffer.isBuffer(e.quote))throw new Error(`Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(e.quote)}`);if(e.raw===void 0||e.raw===null||e.raw===!1)e.raw=!1;else if(e.raw!==!0)throw new Error(`Invalid Option: raw must be true, got ${JSON.stringify(e.raw)}`);if(e.record_delimiter===void 0)e.record_delimiter=[];else if(typeof e.record_delimiter=="string"||Buffer.isBuffer(e.record_delimiter)){if(e.record_delimiter.length===0)throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a non empty string or buffer,",`got ${JSON.stringify(e.record_delimiter)}`],e);e.record_delimiter=[e.record_delimiter]}else if(!Array.isArray(e.record_delimiter))throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a string, a buffer or array of string|buffer,",`got ${JSON.stringify(e.record_delimiter)}`],e);if(e.record_delimiter=e.record_delimiter.map(function(n,i){if(typeof n!="string"&&!Buffer.isBuffer(n))throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a string, a buffer or array of string|buffer",`at index ${i},`,`got ${JSON.stringify(n)}`],e);if(n.length===0)throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a non empty string or buffer",`at index ${i},`,`got ${JSON.stringify(n)}`],e);return typeof n=="string"&&(n=Buffer.from(n,e.encoding)),n}),typeof e.relax_column_count!="boolean")if(e.relax_column_count===void 0||e.relax_column_count===null)e.relax_column_count=!1;else throw new Error(`Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(e.relax_column_count)}`);if(typeof e.relax_column_count_less!="boolean")if(e.relax_column_count_less===void 0||e.relax_column_count_less===null)e.relax_column_count_less=!1;else throw new Error(`Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(e.relax_column_count_less)}`);if(typeof e.relax_column_count_more!="boolean")if(e.relax_column_count_more===void 0||e.relax_column_count_more===null)e.relax_column_count_more=!1;else throw new Error(`Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(e.relax_column_count_more)}`);if(typeof e.relax_quotes!="boolean")if(e.relax_quotes===void 0||e.relax_quotes===null)e.relax_quotes=!1;else throw new Error(`Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(e.relax_quotes)}`);if(typeof e.skip_empty_lines!="boolean")if(e.skip_empty_lines===void 0||e.skip_empty_lines===null)e.skip_empty_lines=!1;else throw new Error(`Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(e.skip_empty_lines)}`);if(typeof e.skip_records_with_empty_values!="boolean")if(e.skip_records_with_empty_values===void 0||e.skip_records_with_empty_values===null)e.skip_records_with_empty_values=!1;else throw new Error(`Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(e.skip_records_with_empty_values)}`);if(typeof e.skip_records_with_error!="boolean")if(e.skip_records_with_error===void 0||e.skip_records_with_error===null)e.skip_records_with_error=!1;else throw new Error(`Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(e.skip_records_with_error)}`);if(e.rtrim===void 0||e.rtrim===null||e.rtrim===!1)e.rtrim=!1;else if(e.rtrim!==!0)throw new Error(`Invalid Option: rtrim must be a boolean, got ${JSON.stringify(e.rtrim)}`);if(e.ltrim===void 0||e.ltrim===null||e.ltrim===!1)e.ltrim=!1;else if(e.ltrim!==!0)throw new Error(`Invalid Option: ltrim must be a boolean, got ${JSON.stringify(e.ltrim)}`);if(e.trim===void 0||e.trim===null||e.trim===!1)e.trim=!1;else if(e.trim!==!0)throw new Error(`Invalid Option: trim must be a boolean, got ${JSON.stringify(e.trim)}`);if(e.trim===!0&&t.ltrim!==!1?e.ltrim=!0:e.ltrim!==!0&&(e.ltrim=!1),e.trim===!0&&t.rtrim!==!1?e.rtrim=!0:e.rtrim!==!0&&(e.rtrim=!1),e.to===void 0||e.to===null)e.to=-1;else if(e.to!==-1)if(typeof e.to=="string"&&/\d+/.test(e.to)&&(e.to=parseInt(e.to)),Number.isInteger(e.to)){if(e.to<=0)throw new Error(`Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(t.to)}`)}else throw new Error(`Invalid Option: to must be an integer, got ${JSON.stringify(t.to)}`);if(e.to_line===void 0||e.to_line===null)e.to_line=-1;else if(e.to_line!==-1)if(typeof e.to_line=="string"&&/\d+/.test(e.to_line)&&(e.to_line=parseInt(e.to_line)),Number.isInteger(e.to_line)){if(e.to_line<=0)throw new Error(`Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(t.to_line)}`)}else throw new Error(`Invalid Option: to_line must be an integer, got ${JSON.stringify(t.to_line)}`);return e},ie=function(t){return t.every(e=>e==null||e.toString&&e.toString().trim()==="")},ye=13,Se=10,J={utf8:Buffer.from([239,187,191]),utf16le:Buffer.from([255,254])},xe=function(t={}){const e={bytes:0,comment_lines:0,empty_lines:0,invalid_field_length:0,lines:1,records:0},l=ne(t);return{info:e,original_options:t,options:l,state:we(l),__needMoreData:function(n,i,s){if(s)return!1;const{encoding:r,escape:o,quote:f}=this.options,{quoting:a,needMoreDataSize:w,recordDelimiterMaxLength:m}=this.state,_=i-n-1,D=Math.max(w,m===0?Buffer.from(`\r
`,r).length:m,a?(o===null?0:o.length)+f.length:0,a?f.length+m:0);return _<D},parse:function(n,i,s,r){const{bom:o,comment_no_infix:f,encoding:a,from_line:w,ltrim:m,max_record_size:_,raw:D,relax_quotes:E,rtrim:c,skip_empty_lines:b,to:x,to_line:p}=this.options;let{comment:d,escape:T,quote:R,record_delimiter:q}=this.options;const{bomSkipped:I,previousBuf:M,rawBuffer:P,escapeIsQuote:W}=this.state;let y;if(M===void 0)if(n===void 0){r();return}else y=n;else M!==void 0&&n===void 0?y=M:y=Buffer.concat([M,n]);if(I===!1)if(o===!1)this.state.bomSkipped=!0;else if(y.length<3){if(i===!1){this.state.previousBuf=y;return}}else{for(const C in J)if(J[C].compare(y,0,J[C].length)===0){const L=J[C].length;this.state.bufBytesStart+=L,y=y.slice(L);const U=ne({...this.original_options,encoding:C});for(const N in U)this.options[N]=U[N];({comment:d,escape:T,quote:R}=this.options);break}this.state.bomSkipped=!0}const F=y.length;let u;for(u=0;u<F&&!this.__needMoreData(u,F,i);u++){if(this.state.wasRowDelimiter===!0&&(this.info.lines++,this.state.wasRowDelimiter=!1),p!==-1&&this.info.lines>p){this.state.stop=!0,r();return}this.state.quoting===!1&&q.length===0&&this.__autoDiscoverRecordDelimiter(y,u)&&(q=this.options.record_delimiter);const C=y[u];if(D===!0&&P.append(C),(C===ye||C===Se)&&this.state.wasRowDelimiter===!1&&(this.state.wasRowDelimiter=!0),this.state.escaping===!0)this.state.escaping=!1;else{if(T!==null&&this.state.quoting===!0&&this.__isEscape(y,u,C)&&u+T.length<F)if(W){if(this.__isQuote(y,u+T.length)){this.state.escaping=!0,u+=T.length-1;continue}}else{this.state.escaping=!0,u+=T.length-1;continue}if(this.state.commenting===!1&&this.__isQuote(y,u))if(this.state.quoting===!0){const N=y[u+R.length],$=c&&this.__isCharTrimable(y,u+R.length),B=d!==null&&this.__compareBytes(d,y,u+R.length,N),V=this.__isDelimiter(y,u+R.length,N),z=q.length===0?this.__autoDiscoverRecordDelimiter(y,u+R.length):this.__isRecordDelimiter(N,y,u+R.length);if(T!==null&&this.__isEscape(y,u,C)&&this.__isQuote(y,u+T.length))u+=T.length-1;else if(!N||V||z||B||$){this.state.quoting=!1,this.state.wasQuoting=!0,u+=R.length-1;continue}else if(E===!1){const ee=this.__error(new S("CSV_INVALID_CLOSING_QUOTE",["Invalid Closing Quote:",`got "${String.fromCharCode(N)}"`,`at line ${this.info.lines}`,"instead of delimiter, record delimiter, trimable character","(if activated) or comment"],this.options,this.__infoField()));if(ee!==void 0)return ee}else this.state.quoting=!1,this.state.wasQuoting=!0,this.state.field.prepend(R),u+=R.length-1}else if(this.state.field.length!==0){if(E===!1){const N=this.__infoField(),$=Object.keys(J).map(V=>J[V].equals(this.state.field.toString())?V:!1).filter(Boolean)[0],B=this.__error(new S("INVALID_OPENING_QUOTE",["Invalid Opening Quote:",`a quote is found on field ${JSON.stringify(N.column)} at line ${N.lines}, value is ${JSON.stringify(this.state.field.toString(a))}`,$?`(${$} bom)`:void 0],this.options,N,{field:this.state.field}));if(B!==void 0)return B}}else{this.state.quoting=!0,u+=R.length-1;continue}if(this.state.quoting===!1){const N=this.__isRecordDelimiter(C,y,u);if(N!==0){if(this.state.commenting&&this.state.wasQuoting===!1&&this.state.record.length===0&&this.state.field.length===0)this.info.comment_lines++;else{if(this.state.enabled===!1&&this.info.lines+(this.state.wasRowDelimiter===!0?1:0)>=w){this.state.enabled=!0,this.__resetField(),this.__resetRecord(),u+=N-1;continue}if(b===!0&&this.state.wasQuoting===!1&&this.state.record.length===0&&this.state.field.length===0){this.info.empty_lines++,u+=N-1;continue}this.info.bytes=this.state.bufBytesStart+u;const V=this.__onField();if(V!==void 0)return V;this.info.bytes=this.state.bufBytesStart+u+N;const z=this.__onRecord(s);if(z!==void 0)return z;if(x!==-1&&this.info.records>=x){this.state.stop=!0,r();return}}this.state.commenting=!1,u+=N-1;continue}if(this.state.commenting)continue;if(d!==null&&(f===!1||this.state.record.length===0&&this.state.field.length===0)&&this.__compareBytes(d,y,u,C)!==0){this.state.commenting=!0;continue}const $=this.__isDelimiter(y,u,C);if($!==0){this.info.bytes=this.state.bufBytesStart+u;const B=this.__onField();if(B!==void 0)return B;u+=$-1;continue}}}if(this.state.commenting===!1&&_!==0&&this.state.record_length+this.state.field.length>_)return this.__error(new S("CSV_MAX_RECORD_SIZE",["Max Record Size:","record exceed the maximum number of tolerated bytes",`of ${_}`,`at line ${this.info.lines}`],this.options,this.__infoField()));const L=m===!1||this.state.quoting===!0||this.state.field.length!==0||!this.__isCharTrimable(y,u),U=c===!1||this.state.wasQuoting===!1;if(L===!0&&U===!0)this.state.field.append(C);else{if(c===!0&&!this.__isCharTrimable(y,u))return this.__error(new S("CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE",["Invalid Closing Quote:","found non trimable byte after quote",`at line ${this.info.lines}`],this.options,this.__infoField()));L===!1&&(u+=this.__isCharTrimable(y,u)-1);continue}}if(i===!0)if(this.state.quoting===!0){const C=this.__error(new S("CSV_QUOTE_NOT_CLOSED",["Quote Not Closed:",`the parsing is finished with an opening quote at line ${this.info.lines}`],this.options,this.__infoField()));if(C!==void 0)return C}else if(this.state.wasQuoting===!0||this.state.record.length!==0||this.state.field.length!==0){this.info.bytes=this.state.bufBytesStart+u;const C=this.__onField();if(C!==void 0)return C;const L=this.__onRecord(s);if(L!==void 0)return L}else this.state.wasRowDelimiter===!0?this.info.empty_lines++:this.state.commenting===!0&&this.info.comment_lines++;else this.state.bufBytesStart+=u,this.state.previousBuf=y.slice(u);this.state.wasRowDelimiter===!0&&(this.info.lines++,this.state.wasRowDelimiter=!1)},__onRecord:function(n){const{columns:i,group_columns_by_name:s,encoding:r,info:o,from:f,relax_column_count:a,relax_column_count_less:w,relax_column_count_more:m,raw:_,skip_records_with_empty_values:D}=this.options,{enabled:E,record:c}=this.state;if(E===!1)return this.__resetRecord();const b=c.length;if(i===!0){if(D===!0&&ie(c)){this.__resetRecord();return}return this.__firstLineToColumns(c)}if(i===!1&&this.info.records===0&&(this.state.expectedRecordLength=b),b!==this.state.expectedRecordLength){const x=i===!1?new S("CSV_RECORD_INCONSISTENT_FIELDS_LENGTH",["Invalid Record Length:",`expect ${this.state.expectedRecordLength},`,`got ${b} on line ${this.info.lines}`],this.options,this.__infoField(),{record:c}):new S("CSV_RECORD_INCONSISTENT_COLUMNS",["Invalid Record Length:",`columns length is ${i.length},`,`got ${b} on line ${this.info.lines}`],this.options,this.__infoField(),{record:c});if(a===!0||w===!0&&b<this.state.expectedRecordLength||m===!0&&b>this.state.expectedRecordLength)this.info.invalid_field_length++,this.state.error=x;else{const p=this.__error(x);if(p)return p}}if(D===!0&&ie(c)){this.__resetRecord();return}if(this.state.recordHasError===!0){this.__resetRecord(),this.state.recordHasError=!1;return}if(this.info.records++,f===1||this.info.records>=f){const{objname:x}=this.options;if(i!==!1){const p={};for(let d=0,T=c.length;d<T;d++)i[d]===void 0||i[d].disabled||(s===!0&&p[i[d].name]!==void 0?Array.isArray(p[i[d].name])?p[i[d].name]=p[i[d].name].concat(c[d]):p[i[d].name]=[p[i[d].name],c[d]]:p[i[d].name]=c[d]);if(_===!0||o===!0){const d=Object.assign({record:p},_===!0?{raw:this.state.rawBuffer.toString(r)}:{},o===!0?{info:this.__infoRecord()}:{}),T=this.__push(x===void 0?d:[p[x],d],n);if(T)return T}else{const d=this.__push(x===void 0?p:[p[x],p],n);if(d)return d}}else if(_===!0||o===!0){const p=Object.assign({record:c},_===!0?{raw:this.state.rawBuffer.toString(r)}:{},o===!0?{info:this.__infoRecord()}:{}),d=this.__push(x===void 0?p:[c[x],p],n);if(d)return d}else{const p=this.__push(x===void 0?c:[c[x],c],n);if(p)return p}}this.__resetRecord()},__firstLineToColumns:function(n){const{firstLineToHeaders:i}=this.state;try{const s=i===void 0?n:i.call(null,n);if(!Array.isArray(s))return this.__error(new S("CSV_INVALID_COLUMN_MAPPING",["Invalid Column Mapping:","expect an array from column function,",`got ${JSON.stringify(s)}`],this.options,this.__infoField(),{headers:s}));const r=se(s);this.state.expectedRecordLength=r.length,this.options.columns=r,this.__resetRecord();return}catch(s){return s}},__resetRecord:function(){this.options.raw===!0&&this.state.rawBuffer.reset(),this.state.error=void 0,this.state.record=[],this.state.record_length=0},__onField:function(){const{cast:n,encoding:i,rtrim:s,max_record_size:r}=this.options,{enabled:o,wasQuoting:f}=this.state;if(o===!1)return this.__resetField();let a=this.state.field.toString(i);if(s===!0&&f===!1&&(a=a.trimRight()),n===!0){const[w,m]=this.__cast(a);if(w!==void 0)return w;a=m}this.state.record.push(a),r!==0&&typeof a=="string"&&(this.state.record_length+=a.length),this.__resetField()},__resetField:function(){this.state.field.reset(),this.state.wasQuoting=!1},__push:function(n,i){const{on_record:s}=this.options;if(s!==void 0){const r=this.__infoRecord();try{n=s.call(null,n,r)}catch(o){return o}if(n==null)return}i(n)},__cast:function(n){const{columns:i,relax_column_count:s}=this.options;if(Array.isArray(i)===!0&&s&&this.options.columns.length<=this.state.record.length)return[void 0,void 0];if(this.state.castField!==null)try{const o=this.__infoField();return[void 0,this.state.castField.call(null,n,o)]}catch(o){return[o]}if(this.__isFloat(n))return[void 0,parseFloat(n)];if(this.options.cast_date!==!1){const o=this.__infoField();return[void 0,this.options.cast_date.call(null,n,o)]}return[void 0,n]},__isCharTrimable:function(n,i){return((r,o)=>{const{timchars:f}=this.state;e:for(let a=0;a<f.length;a++){const w=f[a];for(let m=0;m<w.length;m++)if(w[m]!==r[o+m])continue e;return w.length}return 0})(n,i)},__isFloat:function(n){return n-parseFloat(n)+1>=0},__compareBytes:function(n,i,s,r){if(n[0]!==r)return 0;const o=n.length;for(let f=1;f<o;f++)if(n[f]!==i[s+f])return 0;return o},__isDelimiter:function(n,i,s){const{delimiter:r,ignore_last_delimiters:o}=this.options;if(o===!0&&this.state.record.length===this.options.columns.length-1)return 0;if(o!==!1&&typeof o=="number"&&this.state.record.length===o-1)return 0;e:for(let f=0;f<r.length;f++){const a=r[f];if(a[0]===s){for(let w=1;w<a.length;w++)if(a[w]!==n[i+w])continue e;return a.length}}return 0},__isRecordDelimiter:function(n,i,s){const{record_delimiter:r}=this.options,o=r.length;e:for(let f=0;f<o;f++){const a=r[f],w=a.length;if(a[0]===n){for(let m=1;m<w;m++)if(a[m]!==i[s+m])continue e;return a.length}}return 0},__isEscape:function(n,i,s){const{escape:r}=this.options;if(r===null)return!1;const o=r.length;if(r[0]===s){for(let f=0;f<o;f++)if(r[f]!==n[i+f])return!1;return!0}return!1},__isQuote:function(n,i){const{quote:s}=this.options;if(s===null)return!1;const r=s.length;for(let o=0;o<r;o++)if(s[o]!==n[i+o])return!1;return!0},__autoDiscoverRecordDelimiter:function(n,i){const{encoding:s}=this.options,r=[Buffer.from(`\r
`,s),Buffer.from(`
`,s),Buffer.from("\r",s)];e:for(let o=0;o<r.length;o++){const f=r[o].length;for(let a=0;a<f;a++)if(r[o][a]!==n[i+a])continue e;return this.options.record_delimiter.push(r[o]),this.state.recordDelimiterMaxLength=r[o].length,r[o].length}return 0},__error:function(n){const{encoding:i,raw:s,skip_records_with_error:r}=this.options,o=typeof n=="string"?new Error(n):n;if(r){if(this.state.recordHasError=!0,this.options.on_skip!==void 0)try{this.options.on_skip(o,s?this.state.rawBuffer.toString(i):void 0)}catch(f){return f}return}else return o},__infoDataSet:function(){return{...this.info,columns:this.options.columns}},__infoRecord:function(){const{columns:n,raw:i,encoding:s}=this.options;return{...this.__infoDataSet(),error:this.state.error,header:n===!0,index:this.state.record.length,raw:i?this.state.rawBuffer.toString(s):void 0}},__infoField:function(){const{columns:n}=this.options,i=Array.isArray(n);return{...this.__infoRecord(),column:i===!0?n.length>this.state.record.length?n[this.state.record.length].name:null:this.state.record.length,quoting:this.state.wasQuoting}}}},le=function(t,e={}){typeof t=="string"&&(t=Buffer.from(t));const l=e&&e.objname?{}:[],n=xe(e),i=o=>{n.options.objname===void 0?l.push(o):l[o[0]]=o[1]},s=()=>{},r=n.parse(t,!0,i,s);if(r!==void 0)throw r;return l};process.env.DIST_ELECTRON=k.join(__dirname,"../dist-electron");process.env.DIST=k.join(__dirname,"../dist");process.env.PUBLIC=process.env.VITE_DEV_SERVER_URL?k.join(process.env.DIST_ELECTRON,"../public"):process.env.DIST;let g=null,h=null;const G="https://partner.steampowered.com/nav_games.php",Ie=/partner\.steampowered\.com\/app\/details\/(\d+)/,Ce=/partner\.steampowered\.com\/(nav_games\.php|)/;let O=null,oe=!1;function ae(){g=new v.BrowserWindow({width:1200,height:800,icon:k.join(process.env.PUBLIC??"","icon.png"),webPreferences:{preload:k.join(__dirname,"../dist-electron/preload.js"),nodeIntegration:!0,contextIsolation:!1},backgroundColor:"#000000",titleBarStyle:"hiddenInset",trafficLightPosition:{x:12,y:12}}),g.webContents.setWindowOpenHandler(({url:t})=>(t.startsWith("http")&&v.shell.openExternal(t),{action:"deny"})),g.setMenuBarVisibility(!1),g.webContents.on("did-finish-load",()=>{g?.webContents.send("main-process-message",new Date().toLocaleString())}),process.env.VITE_DEV_SERVER_URL?g.loadURL(process.env.VITE_DEV_SERVER_URL):g.loadFile(k.join(process.env.DIST??"","index.html")),Oe(),X()}function X(){g&&(O=new v.BrowserView({webPreferences:{nodeIntegration:!1,contextIsolation:!0}}))}function Oe(){if(!g)return;h=new v.BrowserView({webPreferences:{preload:k.join(__dirname,"../dist-electron/steam-preload.js"),nodeIntegration:!0,contextIsolation:!1,sandbox:!1}}),g.setBrowserView(h);const t=g.getContentBounds();h.setBounds({x:0,y:0,width:t.width,height:t.height}),g.on("resize",()=>{if(h&&!fe){const e=g?.getContentBounds();e&&h.setBounds({x:0,y:0,width:e.width,height:e.height})}}),h.webContents.loadURL(G),h.webContents.on("did-finish-load",()=>{Q()}),h.webContents.on("did-navigate",()=>{Q()}),h.webContents.on("did-navigate-in-page",()=>{Q()})}let fe=!1,re=0,H=0;function Q(){if(!h||h.webContents.isDestroyed())return;const t=h.webContents.getURL();if(console.log("Current URL:",t),Ie.test(t)){console.log("Target URL detected! Showing Dashboard option."),Be(),console.log("Sending show-dashboard-button to Steam View"),setTimeout(()=>{!h||h.webContents.isDestroyed()||h.webContents.send("show-dashboard-button",!0)},500),Ae();const e=t.match(/app\/details\/(\d+)/),l=e?e[1]:null;g?.webContents.send("steam-target-detected",l),l&&(De(l),Re(l))}else Ce.test(t)?(console.log("All Products URL detected! Showing Portfolio Dashboard."),ke(),console.log("Sending show-dashboard-button to Steam View for Portfolio"),setTimeout(()=>{!h||h.webContents.isDestroyed()||h.webContents.send("show-dashboard-button",!0)},500),g?.webContents.send("steam-target-detected","portfolio"),oe||(oe=!0,ue(!0))):g?.webContents.send("steam-target-detected",!1)}const ve=360*60*1e3,K=k.join(v.app.getPath("userData"),"steam-history.json"),Y=k.join(v.app.getPath("userData"),"steam-wishlist.json");function ce(){try{if(A.existsSync(K)){const t=A.readFileSync(K,"utf-8");return JSON.parse(t)}}catch(t){console.error("Failed to load history store:",t)}return{}}function Ne(t){try{A.writeFileSync(K,JSON.stringify(t,null,2))}catch(e){console.error("Failed to save history store:",e)}}function Z(){try{if(A.existsSync(Y)){const t=A.readFileSync(Y,"utf-8");return JSON.parse(t)}}catch(t){console.error("Failed to load wishlist store:",t)}return{}}function Te(t){try{A.writeFileSync(Y,JSON.stringify(t,null,2))}catch(e){console.error("Failed to save wishlist store:",e)}}function De(t){if(!O&&(X(),!O))return;const e=Date.now(),n=ce()[t];if(n&&n.data.length>0&&(console.log(`Sending cached history for ${t} (${n.data.length} records)`),g?.webContents.send("steam-history-update",{appId:t,history:n.data}),n.lastUpdated&&e-n.lastUpdated<ve)){console.log(`Skipping history fetch for ${t} (cached & fresh)`);return}console.log(`Starting history fetch for ${t}...`);const r=`https://partner.steampowered.com/app/details/${t}/?dateStart=2000-01-01&dateEnd=${(w=>w.toISOString().split("T")[0])(new Date)}`;console.log(`Loading history URL: ${r}`),g&&(g.addBrowserView(O),O.setBounds({x:0,y:0,width:0,height:0}));const o=++re,f=O.webContents.id,a=(w,m,_)=>{if(o!==re||!O||O.webContents.isDestroyed()||_.id!==f||!m.getFilename().toLowerCase().endsWith(".csv"))return;const E=k.join(v.app.getPath("temp"),`steam_history_${t}_${Date.now()}.csv`);m.setSavePath(E),m.once("done",(c,b)=>{v.session.defaultSession.off("will-download",a),b==="completed"?(console.log("Download completed:",E),Ee(t,E)):console.log(`Download failed: ${b}`)})};v.session.defaultSession.on("will-download",a),O.webContents.loadURL(r),O.webContents.once("did-finish-load",async()=>{console.log("History page loaded. Triggering CSV download..."),setTimeout(async()=>{const w=`
                (function() {
                    const btn = document.querySelector('input[value="view as .csv"]');
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    // Fallback: Try to submit the form directly if button hidden
                    const form = document.querySelector('form[action*="report_csv.php"]');
                    if (form) {
                        form.submit();
                        return true;
                    }
                    return false;
                })()
            `;try{if(!O||O.webContents.isDestroyed()){v.session.defaultSession.off("will-download",a);return}await O.webContents.executeJavaScript(w)?console.log("CSV download triggered successfully."):(console.error("Could not find CSV download button/form."),v.session.defaultSession.off("will-download",a))}catch(m){console.error("Failed to trigger CSV download:",m),v.session.defaultSession.off("will-download",a)}},3e3)})}function Ee(t,e){try{const n=A.readFileSync(e,"utf-8").split(`
`);let i=0;for(let a=0;a<Math.min(10,n.length);a++)if(n[a].toLowerCase().includes("date")&&n[a].toLowerCase().includes("units")){i=a;break}const s=n.slice(i).join(`
`),r=le(s,{columns:!0,skip_empty_lines:!0,trim:!0}),o=[];if(r.length>0){const a=Object.keys(r[0]),w=a.find(_=>_.toLowerCase().includes("date")),m=a.find(_=>_.toLowerCase().includes("total units")||_.toLowerCase().includes("units"));if(w&&m)for(const _ of r){const D=_[w],E=_[m];if(D&&E){const c=parseInt(E.replace(/,/g,""))||0;let b=D;const x=new Date(D);isNaN(x.getTime())||(b=x.toISOString().split("T")[0]),o.push({date:b,value:c})}}}o.sort((a,w)=>new Date(a.date).getTime()-new Date(w.date).getTime());const f=ce();f[t]={lastUpdated:Date.now(),data:o},Ne(f),console.log(`Processed ${o.length} history records for ${t}.`),g?.webContents.send("steam-history-update",{appId:t,history:o}),A.unlinkSync(e)}catch(l){console.error("Error processing history CSV:",l)}}function Re(t){if(!O&&(X(),!O))return;const l=Z()[t];l&&l.data.length>0&&g?.webContents.send("steam-wishlist-update",{appId:t,wishlist:l.data,currentOutstanding:l.currentOutstanding??null}),g&&(g.addBrowserView(O),O.setBounds({x:0,y:0,width:0,height:0}));const n=++H,i=`https://partner.steampowered.com/app/wishlist/${t}/`;O.webContents.loadURL(i),O.webContents.once("did-finish-load",async()=>{setTimeout(async()=>{try{if(!O||O.webContents.isDestroyed()||n!==H)return;const s=await O.webContents.executeJavaScript(`
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
                `);console.log(`[wishlist] Meta for ${t}:`,s);const r=s?.firstDate||"2000-01-01",o=new Date().toISOString().split("T")[0],f=`https://partner.steampowered.com/report_csv.php?file=SteamWishlists_${t}_${r}_to_${o}&params=query=QueryWishlistActionsForCSV^appID=${t}^dateStart=${r}^dateEnd=${o}^interpreter=WishlistReportInterpreter`;console.log(`[wishlist] CSV URL for ${t}: ${f}`);const a=await O.webContents.executeJavaScript(`
                    (async function() {
                        const response = await fetch(${JSON.stringify(f)}, { credentials: 'include' })
                        if (!response.ok) return ''
                        return await response.text()
                    })()
                `);if(n!==H)return;Le(t,a||"",s?.currentOutstanding??null)}catch(s){console.error("Failed to trigger wishlist csv download:",s)}},2e3)})}function Le(t,e,l){try{const i=Z()[t]?.currentOutstanding??null,s=l??i;if(!e||e.includes("Steamworks Product Data login")){g?.webContents.send("steam-wishlist-update",{appId:t,wishlist:[],currentOutstanding:s});return}const r=e.split(/\r?\n/).map(c=>c.trimEnd());let o=",";r[0]&&r[0].toLowerCase().startsWith("sep=")&&(o=r[0].slice(4).trim()||",");let f=-1;for(let c=0;c<Math.min(60,r.length);c++){const b=r[c].toLowerCase();if(b.includes("date")&&(b.includes("wishlist")||b.includes("add")||b.includes("outstanding")||b.includes("balance"))){f=c;break}}if(f===-1){console.error(`[wishlist] Header not found for ${t}. Preview:`,r.slice(0,8).join(" | ")),g?.webContents.send("steam-wishlist-update",{appId:t,wishlist:[],currentOutstanding:s});return}const a=r.slice(f).join(`
`),w=le(a,{columns:!0,skip_empty_lines:!0,trim:!0,delimiter:o,relax_column_count:!0,skip_records_with_error:!0}),m=c=>{if(!c)return 0;const b=c.trim();if(!b)return 0;const x=b.startsWith("(")&&b.endsWith(")"),p=b.replace(/[(),]/g,""),d=parseInt(p,10)||0;return x?-d:d},_=[];if(w.length>0){const c=Object.keys(w[0]),b=c.find(I=>I.toLowerCase().includes("date")),x=c.find(I=>I.toLowerCase().includes("add")),p=c.find(I=>I.toLowerCase().includes("delet")),d=c.find(I=>I.toLowerCase().includes("purchase")),T=c.find(I=>I.toLowerCase().includes("gift")),R=c.find(I=>I.toLowerCase().includes("outstanding")||I.toLowerCase().includes("balance")),q=c.find(I=>I.toLowerCase().includes("net"));if(b)for(const I of w){const M=I[b],P=new Date(M);if(isNaN(P.getTime()))continue;const W=P.toISOString().split("T")[0],y=Math.abs(m(x?I[x]:void 0)),F=-Math.abs(m(p?I[p]:void 0)),u=-Math.abs(m(d?I[d]:void 0)),C=-Math.abs(m(T?I[T]:void 0)),L=m(R?I[R]:void 0),U=q?m(I[q]):y+F+u+C;_.push({date:W,additions:y,deletions:F,purchases:u,gifts:C,balance:L,net:U})}}if(_.sort((c,b)=>new Date(c.date).getTime()-new Date(b.date).getTime()),_.length>0){let c=0;for(const p of _)c+=p.net,p.balance=c;const b=_[_.length-1].balance,x=s??(b>0?b:null);if(x!==null){const p=x-_[_.length-1].balance;for(const d of _)d.balance+=p}}const D=Z(),E=s??(_.length>0?_[_.length-1].balance:null);D[t]={lastUpdated:Date.now(),data:_,currentOutstanding:E},Te(D),g?.webContents.send("steam-wishlist-update",{appId:t,wishlist:_,currentOutstanding:E})}catch(n){console.error("Error processing wishlist CSV:",n)}}async function ke(){if(!h||h.webContents.isDestroyed())return;const t=`
     (function() {
       try {
         const data = { type: 'portfolio', games: [] };
         
         // Helper to clean text
         const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
         
         // Find all rows in the document
        const rows = Array.from(document.querySelectorAll('tr'));
        
        // Extract Company-wide stats (usually at top)
        // Look for rows with "Lifetime revenue", "Steam units", etc.
        // The screenshot shows:
        // ACTIDIMENSION... Lifetime revenue | $147,297
        // ... Steam units | 29,872
        
        // Helper to find value in row by label
        const findStat = (labelPattern) => {
            for (const row of rows) {
                if (row.innerText.match(labelPattern)) {
                    // usually value is in the last cell or second cell
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0) {
                        return cells[cells.length - 1].innerText.trim();
                    }
                }
            }
            return null;
        };

        data.lifetimeRevenue = findStat(/Lifetime revenue/i);
        data.steamUnits = findStat(/Steam units/i);
        data.retailActivations = findStat(/retail activations/i);
        data.totalUnits = findStat(/lifetime units total/i) || findStat(/Total units/i);
        
        // Also get company name from h2 or title
        const companyHeader = document.querySelector('h2');
        if (companyHeader && companyHeader.innerText.includes('Steam Stats')) {
             data.title = companyHeader.innerText.replace('Steam Stats - ', '').trim();
        }

        // Try to identify column indices from header
         let unitsColIndex = -1;
         let rankColIndex = -1;
         
         // Look for header row safely
         const headerRow = Array.from(document.querySelectorAll('tr')).find(r => 
             r.innerText.toLowerCase().includes('rank') && 
             (r.innerText.toLowerCase().includes('units') || r.innerText.toLowerCase().includes('product'))
         ) || rows[0];
         
         if (headerRow) {
             const cells = headerRow.querySelectorAll('th, td');
             for (let i = 0; i < cells.length; i++) {
                 const text = cells[i].innerText.toLowerCase();
                 if (text.includes('rank')) rankColIndex = i;
                 if ((text.includes('units') && (text.includes('current') || text.includes('today'))) || text === 'current units') unitsColIndex = i;
             }
         }

        for (const row of rows) {
             const link = row.querySelector('a[href*="/app/details/"]');
             
             // Ensure this row actually has cells and looks like a product row
             const cells = row.querySelectorAll('td');
             
             if (link && cells.length >= 3) {
                 const name = cleanText(link.innerText);
                 const href = link.getAttribute('href');
                 const appIdMatch = href.match(/app\\/details\\/(\\d+)/);
                 const appId = appIdMatch ? appIdMatch[1] : null;
                 
                 if (appId) {
                      let rank = '0';
                      let units = '0';
                      
                      // Strategy 1: Use identified column indices
                      if (unitsColIndex > -1 && cells[unitsColIndex]) {
                          units = cleanText(cells[unitsColIndex].innerText);
                      }
                      if (rankColIndex > -1 && cells[rankColIndex]) {
                          rank = cleanText(cells[rankColIndex].innerText);
                      }

                      // Strategy 2: Fallback to relative position (Link -> Rank -> Units)
                      if (units === '0' && rank === '0') {
                          const linkParentCell = link.closest('td');
                          if (linkParentCell) {
                              // Find index of this cell
                              const cellIndex = Array.from(row.children).indexOf(linkParentCell);
                              if (cellIndex > -1) {
                                  // Assume Rank is next, Units is next next
                                  if (cells[cellIndex + 1]) rank = cleanText(cells[cellIndex + 1].innerText);
                                  if (cells[cellIndex + 2]) units = cleanText(cells[cellIndex + 2].innerText);
                              }
                          }
                      }
                      
                      data.games.push({
                          name,
                          appId,
                          rank,
                          units
                      });
                 }
             }
         }
         
         return data;
       } catch (e) {
         return { error: e.message };
       }
     })()
   `;try{const e=await h.webContents.executeJavaScript(t);console.log("Scraped Portfolio Data:",e),g?.webContents.send("steam-data-update",e)}catch(e){console.error("Portfolio Scraping failed:",e)}}async function Be(){if(!h)return;const e=h.webContents.getURL().match(/app\/details\/(\d+)/),l=e?e[1]:null,n=`
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
  `;try{const i=await h.webContents.executeJavaScript(n);l&&(i.appId=l),console.log("Scraped Data:",i),g?.webContents.send("steam-data-update",i)}catch(i){console.error("Scraping failed:",i)}}v.ipcMain.on("navigate-to-app",(t,e)=>{if(!h)return;const l=`https://partner.steampowered.com/app/details/${e}/`;console.log(`Navigating to app: ${e} -> ${l}`),h.webContents.loadURL(l)});v.ipcMain.on("navigate-to-portfolio",()=>{h&&(console.log(`Navigating back to portfolio: ${G}`),h.webContents.loadURL(G))});v.ipcMain.on("toggle-dashboard",(t,e)=>{ue(e)});function ue(t){if(fe=t,!(!g||!h||h.webContents.isDestroyed()))if(t)h.setBounds({x:0,y:0,width:0,height:0}),g.webContents.isDestroyed()||g.webContents.send("dashboard-visibility",!0);else{const e=g.getContentBounds();h.setBounds({x:0,y:0,width:e.width,height:e.height}),g.webContents.isDestroyed()||g.webContents.send("dashboard-visibility",!1)}}let j=null;function Ae(){j||(console.log("Starting auto-refresh loop (every 5 minutes)"),j=setInterval(()=>{console.log("Auto-refreshing data..."),h&&!h.webContents.isDestroyed()?h.webContents.reloadIgnoringCache():(j&&clearInterval(j),j=null)},300*1e3))}v.ipcMain.on("refresh-data",()=>{console.log("Manual refresh requested"),h&&h.webContents.reloadIgnoringCache()});v.app.whenReady().then(ae);v.app.on("window-all-closed",()=>{g=null,process.platform!=="darwin"&&v.app.quit()});v.app.on("activate",()=>{v.BrowserWindow.getAllWindows().length===0&&ae()});
