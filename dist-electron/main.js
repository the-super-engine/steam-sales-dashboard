"use strict";const x=require("electron"),k=require("path"),B=require("fs");class S extends Error{constructor(e,l,n,...i){Array.isArray(l)&&(l=l.join(" ").trim()),super(l),Error.captureStackTrace!==void 0&&Error.captureStackTrace(this,S),this.code=e;for(const s of i)for(const r in s){const o=s[r];this[r]=Buffer.isBuffer(o)?o.toString(n.encoding):o==null?o:JSON.parse(JSON.stringify(o))}}}const _e=function(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)},ue=function(t){const e=[];for(let l=0,n=t.length;l<n;l++){const i=t[l];if(i==null||i===!1)e[l]={disabled:!0};else if(typeof i=="string")e[l]={name:i};else if(_e(i)){if(typeof i.name!="string")throw new S("CSV_OPTION_COLUMNS_MISSING_NAME",["Option columns missing name:",`property "name" is required at position ${l}`,"when column is an object literal"]);e[l]=i}else throw new S("CSV_INVALID_COLUMN_DEFINITION",["Invalid column definition:","expect a string or a literal object,",`got ${JSON.stringify(i)} at position ${l}`])}return e};class se{constructor(e=100){this.size=e,this.length=0,this.buf=Buffer.allocUnsafe(e)}prepend(e){if(Buffer.isBuffer(e)){const l=this.length+e.length;if(l>=this.size&&(this.resize(),l>=this.size))throw Error("INVALID_BUFFER_STATE");const n=this.buf;this.buf=Buffer.allocUnsafe(this.size),e.copy(this.buf,0),n.copy(this.buf,e.length),this.length+=e.length}else{const l=this.length++;l===this.size&&this.resize();const n=this.clone();this.buf[0]=e,n.copy(this.buf,1,0,l)}}append(e){const l=this.length++;l===this.size&&this.resize(),this.buf[l]=e}clone(){return Buffer.from(this.buf.slice(0,this.length))}resize(){const e=this.length;this.size=this.size*2;const l=Buffer.allocUnsafe(this.size);this.buf.copy(l,0,0,e),this.buf=l}toString(e){return e?this.buf.slice(0,this.length).toString(e):Uint8Array.prototype.slice.call(this.buf.slice(0,this.length))}toJSON(){return this.toString("utf8")}reset(){this.length=0}}const ge=12,pe=13,we=10,be=32,ye=9,Se=function(t){return{bomSkipped:!1,bufBytesStart:0,castField:t.cast_function,commenting:!1,error:void 0,enabled:t.from_line===1,escaping:!1,escapeIsQuote:Buffer.isBuffer(t.escape)&&Buffer.isBuffer(t.quote)&&Buffer.compare(t.escape,t.quote)===0,expectedRecordLength:Array.isArray(t.columns)?t.columns.length:void 0,field:new se(20),firstLineToHeaders:t.cast_first_line_to_header,needMoreDataSize:Math.max(t.comment!==null?t.comment.length:0,...t.delimiter.map(e=>e.length),t.quote!==null?t.quote.length:0),previousBuf:void 0,quoting:!1,stop:!1,rawBuffer:new se(100),record:[],recordHasError:!1,record_length:0,recordDelimiterMaxLength:t.record_delimiter.length===0?0:Math.max(...t.record_delimiter.map(e=>e.length)),trimChars:[Buffer.from(" ",t.encoding)[0],Buffer.from("	",t.encoding)[0]],wasQuoting:!1,wasRowDelimiter:!1,timchars:[Buffer.from(Buffer.from([pe],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([we],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([ge],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([be],"utf8").toString(),t.encoding),Buffer.from(Buffer.from([ye],"utf8").toString(),t.encoding)]}},xe=function(t){return t.replace(/([A-Z])/g,function(e,l){return"_"+l.toLowerCase()})},le=function(t){const e={};for(const n in t)e[xe(n)]=t[n];if(e.encoding===void 0||e.encoding===!0)e.encoding="utf8";else if(e.encoding===null||e.encoding===!1)e.encoding=null;else if(typeof e.encoding!="string"&&e.encoding!==null)throw new S("CSV_INVALID_OPTION_ENCODING",["Invalid option encoding:","encoding must be a string or null to return a buffer,",`got ${JSON.stringify(e.encoding)}`],e);if(e.bom===void 0||e.bom===null||e.bom===!1)e.bom=!1;else if(e.bom!==!0)throw new S("CSV_INVALID_OPTION_BOM",["Invalid option bom:","bom must be true,",`got ${JSON.stringify(e.bom)}`],e);if(e.cast_function=null,e.cast===void 0||e.cast===null||e.cast===!1||e.cast==="")e.cast=void 0;else if(typeof e.cast=="function")e.cast_function=e.cast,e.cast=!0;else if(e.cast!==!0)throw new S("CSV_INVALID_OPTION_CAST",["Invalid option cast:","cast must be true or a function,",`got ${JSON.stringify(e.cast)}`],e);if(e.cast_date===void 0||e.cast_date===null||e.cast_date===!1||e.cast_date==="")e.cast_date=!1;else if(e.cast_date===!0)e.cast_date=function(n){const i=Date.parse(n);return isNaN(i)?n:new Date(i)};else if(typeof e.cast_date!="function")throw new S("CSV_INVALID_OPTION_CAST_DATE",["Invalid option cast_date:","cast_date must be true or a function,",`got ${JSON.stringify(e.cast_date)}`],e);if(e.cast_first_line_to_header=void 0,e.columns===!0)e.cast_first_line_to_header=void 0;else if(typeof e.columns=="function")e.cast_first_line_to_header=e.columns,e.columns=!0;else if(Array.isArray(e.columns))e.columns=ue(e.columns);else if(e.columns===void 0||e.columns===null||e.columns===!1)e.columns=!1;else throw new S("CSV_INVALID_OPTION_COLUMNS",["Invalid option columns:","expect an array, a function or true,",`got ${JSON.stringify(e.columns)}`],e);if(e.group_columns_by_name===void 0||e.group_columns_by_name===null||e.group_columns_by_name===!1)e.group_columns_by_name=!1;else{if(e.group_columns_by_name!==!0)throw new S("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",["Invalid option group_columns_by_name:","expect an boolean,",`got ${JSON.stringify(e.group_columns_by_name)}`],e);if(e.columns===!1)throw new S("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",["Invalid option group_columns_by_name:","the `columns` mode must be activated."],e)}if(e.comment===void 0||e.comment===null||e.comment===!1||e.comment==="")e.comment=null;else if(typeof e.comment=="string"&&(e.comment=Buffer.from(e.comment,e.encoding)),!Buffer.isBuffer(e.comment))throw new S("CSV_INVALID_OPTION_COMMENT",["Invalid option comment:","comment must be a buffer or a string,",`got ${JSON.stringify(e.comment)}`],e);if(e.comment_no_infix===void 0||e.comment_no_infix===null||e.comment_no_infix===!1)e.comment_no_infix=!1;else if(e.comment_no_infix!==!0)throw new S("CSV_INVALID_OPTION_COMMENT",["Invalid option comment_no_infix:","value must be a boolean,",`got ${JSON.stringify(e.comment_no_infix)}`],e);const l=JSON.stringify(e.delimiter);if(Array.isArray(e.delimiter)||(e.delimiter=[e.delimiter]),e.delimiter.length===0)throw new S("CSV_INVALID_OPTION_DELIMITER",["Invalid option delimiter:","delimiter must be a non empty string or buffer or array of string|buffer,",`got ${l}`],e);if(e.delimiter=e.delimiter.map(function(n){if(n==null||n===!1)return Buffer.from(",",e.encoding);if(typeof n=="string"&&(n=Buffer.from(n,e.encoding)),!Buffer.isBuffer(n)||n.length===0)throw new S("CSV_INVALID_OPTION_DELIMITER",["Invalid option delimiter:","delimiter must be a non empty string or buffer or array of string|buffer,",`got ${l}`],e);return n}),e.escape===void 0||e.escape===!0?e.escape=Buffer.from('"',e.encoding):typeof e.escape=="string"?e.escape=Buffer.from(e.escape,e.encoding):(e.escape===null||e.escape===!1)&&(e.escape=null),e.escape!==null&&!Buffer.isBuffer(e.escape))throw new Error(`Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(e.escape)}`);if(e.from===void 0||e.from===null)e.from=1;else if(typeof e.from=="string"&&/\d+/.test(e.from)&&(e.from=parseInt(e.from)),Number.isInteger(e.from)){if(e.from<0)throw new Error(`Invalid Option: from must be a positive integer, got ${JSON.stringify(t.from)}`)}else throw new Error(`Invalid Option: from must be an integer, got ${JSON.stringify(e.from)}`);if(e.from_line===void 0||e.from_line===null)e.from_line=1;else if(typeof e.from_line=="string"&&/\d+/.test(e.from_line)&&(e.from_line=parseInt(e.from_line)),Number.isInteger(e.from_line)){if(e.from_line<=0)throw new Error(`Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(t.from_line)}`)}else throw new Error(`Invalid Option: from_line must be an integer, got ${JSON.stringify(t.from_line)}`);if(e.ignore_last_delimiters===void 0||e.ignore_last_delimiters===null)e.ignore_last_delimiters=!1;else if(typeof e.ignore_last_delimiters=="number")e.ignore_last_delimiters=Math.floor(e.ignore_last_delimiters),e.ignore_last_delimiters===0&&(e.ignore_last_delimiters=!1);else if(typeof e.ignore_last_delimiters!="boolean")throw new S("CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS",["Invalid option `ignore_last_delimiters`:","the value must be a boolean value or an integer,",`got ${JSON.stringify(e.ignore_last_delimiters)}`],e);if(e.ignore_last_delimiters===!0&&e.columns===!1)throw new S("CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS",["The option `ignore_last_delimiters`","requires the activation of the `columns` option"],e);if(e.info===void 0||e.info===null||e.info===!1)e.info=!1;else if(e.info!==!0)throw new Error(`Invalid Option: info must be true, got ${JSON.stringify(e.info)}`);if(e.max_record_size===void 0||e.max_record_size===null||e.max_record_size===!1)e.max_record_size=0;else if(!(Number.isInteger(e.max_record_size)&&e.max_record_size>=0))if(typeof e.max_record_size=="string"&&/\d+/.test(e.max_record_size))e.max_record_size=parseInt(e.max_record_size);else throw new Error(`Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(e.max_record_size)}`);if(e.objname===void 0||e.objname===null||e.objname===!1)e.objname=void 0;else if(Buffer.isBuffer(e.objname)){if(e.objname.length===0)throw new Error("Invalid Option: objname must be a non empty buffer");e.encoding===null||(e.objname=e.objname.toString(e.encoding))}else if(typeof e.objname=="string"){if(e.objname.length===0)throw new Error("Invalid Option: objname must be a non empty string")}else if(typeof e.objname!="number")throw new Error(`Invalid Option: objname must be a string or a buffer, got ${e.objname}`);if(e.objname!==void 0){if(typeof e.objname=="number"){if(e.columns!==!1)throw Error("Invalid Option: objname index cannot be combined with columns or be defined as a field")}else if(e.columns===!1)throw Error("Invalid Option: objname field must be combined with columns or be defined as an index")}if(e.on_record===void 0||e.on_record===null)e.on_record=void 0;else if(typeof e.on_record!="function")throw new S("CSV_INVALID_OPTION_ON_RECORD",["Invalid option `on_record`:","expect a function,",`got ${JSON.stringify(e.on_record)}`],e);if(e.on_skip!==void 0&&e.on_skip!==null&&typeof e.on_skip!="function")throw new Error(`Invalid Option: on_skip must be a function, got ${JSON.stringify(e.on_skip)}`);if(e.quote===null||e.quote===!1||e.quote==="")e.quote=null;else if(e.quote===void 0||e.quote===!0?e.quote=Buffer.from('"',e.encoding):typeof e.quote=="string"&&(e.quote=Buffer.from(e.quote,e.encoding)),!Buffer.isBuffer(e.quote))throw new Error(`Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(e.quote)}`);if(e.raw===void 0||e.raw===null||e.raw===!1)e.raw=!1;else if(e.raw!==!0)throw new Error(`Invalid Option: raw must be true, got ${JSON.stringify(e.raw)}`);if(e.record_delimiter===void 0)e.record_delimiter=[];else if(typeof e.record_delimiter=="string"||Buffer.isBuffer(e.record_delimiter)){if(e.record_delimiter.length===0)throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a non empty string or buffer,",`got ${JSON.stringify(e.record_delimiter)}`],e);e.record_delimiter=[e.record_delimiter]}else if(!Array.isArray(e.record_delimiter))throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a string, a buffer or array of string|buffer,",`got ${JSON.stringify(e.record_delimiter)}`],e);if(e.record_delimiter=e.record_delimiter.map(function(n,i){if(typeof n!="string"&&!Buffer.isBuffer(n))throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a string, a buffer or array of string|buffer",`at index ${i},`,`got ${JSON.stringify(n)}`],e);if(n.length===0)throw new S("CSV_INVALID_OPTION_RECORD_DELIMITER",["Invalid option `record_delimiter`:","value must be a non empty string or buffer",`at index ${i},`,`got ${JSON.stringify(n)}`],e);return typeof n=="string"&&(n=Buffer.from(n,e.encoding)),n}),typeof e.relax_column_count!="boolean")if(e.relax_column_count===void 0||e.relax_column_count===null)e.relax_column_count=!1;else throw new Error(`Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(e.relax_column_count)}`);if(typeof e.relax_column_count_less!="boolean")if(e.relax_column_count_less===void 0||e.relax_column_count_less===null)e.relax_column_count_less=!1;else throw new Error(`Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(e.relax_column_count_less)}`);if(typeof e.relax_column_count_more!="boolean")if(e.relax_column_count_more===void 0||e.relax_column_count_more===null)e.relax_column_count_more=!1;else throw new Error(`Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(e.relax_column_count_more)}`);if(typeof e.relax_quotes!="boolean")if(e.relax_quotes===void 0||e.relax_quotes===null)e.relax_quotes=!1;else throw new Error(`Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(e.relax_quotes)}`);if(typeof e.skip_empty_lines!="boolean")if(e.skip_empty_lines===void 0||e.skip_empty_lines===null)e.skip_empty_lines=!1;else throw new Error(`Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(e.skip_empty_lines)}`);if(typeof e.skip_records_with_empty_values!="boolean")if(e.skip_records_with_empty_values===void 0||e.skip_records_with_empty_values===null)e.skip_records_with_empty_values=!1;else throw new Error(`Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(e.skip_records_with_empty_values)}`);if(typeof e.skip_records_with_error!="boolean")if(e.skip_records_with_error===void 0||e.skip_records_with_error===null)e.skip_records_with_error=!1;else throw new Error(`Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(e.skip_records_with_error)}`);if(e.rtrim===void 0||e.rtrim===null||e.rtrim===!1)e.rtrim=!1;else if(e.rtrim!==!0)throw new Error(`Invalid Option: rtrim must be a boolean, got ${JSON.stringify(e.rtrim)}`);if(e.ltrim===void 0||e.ltrim===null||e.ltrim===!1)e.ltrim=!1;else if(e.ltrim!==!0)throw new Error(`Invalid Option: ltrim must be a boolean, got ${JSON.stringify(e.ltrim)}`);if(e.trim===void 0||e.trim===null||e.trim===!1)e.trim=!1;else if(e.trim!==!0)throw new Error(`Invalid Option: trim must be a boolean, got ${JSON.stringify(e.trim)}`);if(e.trim===!0&&t.ltrim!==!1?e.ltrim=!0:e.ltrim!==!0&&(e.ltrim=!1),e.trim===!0&&t.rtrim!==!1?e.rtrim=!0:e.rtrim!==!0&&(e.rtrim=!1),e.to===void 0||e.to===null)e.to=-1;else if(e.to!==-1)if(typeof e.to=="string"&&/\d+/.test(e.to)&&(e.to=parseInt(e.to)),Number.isInteger(e.to)){if(e.to<=0)throw new Error(`Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(t.to)}`)}else throw new Error(`Invalid Option: to must be an integer, got ${JSON.stringify(t.to)}`);if(e.to_line===void 0||e.to_line===null)e.to_line=-1;else if(e.to_line!==-1)if(typeof e.to_line=="string"&&/\d+/.test(e.to_line)&&(e.to_line=parseInt(e.to_line)),Number.isInteger(e.to_line)){if(e.to_line<=0)throw new Error(`Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(t.to_line)}`)}else throw new Error(`Invalid Option: to_line must be an integer, got ${JSON.stringify(t.to_line)}`);return e},ae=function(t){return t.every(e=>e==null||e.toString&&e.toString().trim()==="")},Ce=13,Ie=10,J={utf8:Buffer.from([239,187,191]),utf16le:Buffer.from([255,254])},Oe=function(t={}){const e={bytes:0,comment_lines:0,empty_lines:0,invalid_field_length:0,lines:1,records:0},l=le(t);return{info:e,original_options:t,options:l,state:Se(l),__needMoreData:function(n,i,s){if(s)return!1;const{encoding:r,escape:o,quote:c}=this.options,{quoting:a,needMoreDataSize:_,recordDelimiterMaxLength:g}=this.state,p=i-n-1,L=Math.max(_,g===0?Buffer.from(`\r
`,r).length:g,a?(o===null?0:o.length)+c.length:0,a?c.length+g:0);return p<L},parse:function(n,i,s,r){const{bom:o,comment_no_infix:c,encoding:a,from_line:_,ltrim:g,max_record_size:p,raw:L,relax_quotes:R,rtrim:u,skip_empty_lines:b,to:C,to_line:w}=this.options;let{comment:m,escape:T,quote:D,record_delimiter:q}=this.options;const{bomSkipped:I,previousBuf:M,rawBuffer:Q,escapeIsQuote:Y}=this.state;let y;if(M===void 0)if(n===void 0){r();return}else y=n;else M!==void 0&&n===void 0?y=M:y=Buffer.concat([M,n]);if(I===!1)if(o===!1)this.state.bomSkipped=!0;else if(y.length<3){if(i===!1){this.state.previousBuf=y;return}}else{for(const O in J)if(J[O].compare(y,0,J[O].length)===0){const E=J[O].length;this.state.bufBytesStart+=E,y=y.slice(E);const P=le({...this.original_options,encoding:O});for(const N in P)this.options[N]=P[N];({comment:m,escape:T,quote:D}=this.options);break}this.state.bomSkipped=!0}const F=y.length;let d;for(d=0;d<F&&!this.__needMoreData(d,F,i);d++){if(this.state.wasRowDelimiter===!0&&(this.info.lines++,this.state.wasRowDelimiter=!1),w!==-1&&this.info.lines>w){this.state.stop=!0,r();return}this.state.quoting===!1&&q.length===0&&this.__autoDiscoverRecordDelimiter(y,d)&&(q=this.options.record_delimiter);const O=y[d];if(L===!0&&Q.append(O),(O===Ce||O===Ie)&&this.state.wasRowDelimiter===!1&&(this.state.wasRowDelimiter=!0),this.state.escaping===!0)this.state.escaping=!1;else{if(T!==null&&this.state.quoting===!0&&this.__isEscape(y,d,O)&&d+T.length<F)if(Y){if(this.__isQuote(y,d+T.length)){this.state.escaping=!0,d+=T.length-1;continue}}else{this.state.escaping=!0,d+=T.length-1;continue}if(this.state.commenting===!1&&this.__isQuote(y,d))if(this.state.quoting===!0){const N=y[d+D.length],$=u&&this.__isCharTrimable(y,d+D.length),A=m!==null&&this.__compareBytes(m,y,d+D.length,N),V=this.__isDelimiter(y,d+D.length,N),G=q.length===0?this.__autoDiscoverRecordDelimiter(y,d+D.length):this.__isRecordDelimiter(N,y,d+D.length);if(T!==null&&this.__isEscape(y,d,O)&&this.__isQuote(y,d+T.length))d+=T.length-1;else if(!N||V||G||A||$){this.state.quoting=!1,this.state.wasQuoting=!0,d+=D.length-1;continue}else if(R===!1){const re=this.__error(new S("CSV_INVALID_CLOSING_QUOTE",["Invalid Closing Quote:",`got "${String.fromCharCode(N)}"`,`at line ${this.info.lines}`,"instead of delimiter, record delimiter, trimable character","(if activated) or comment"],this.options,this.__infoField()));if(re!==void 0)return re}else this.state.quoting=!1,this.state.wasQuoting=!0,this.state.field.prepend(D),d+=D.length-1}else if(this.state.field.length!==0){if(R===!1){const N=this.__infoField(),$=Object.keys(J).map(V=>J[V].equals(this.state.field.toString())?V:!1).filter(Boolean)[0],A=this.__error(new S("INVALID_OPENING_QUOTE",["Invalid Opening Quote:",`a quote is found on field ${JSON.stringify(N.column)} at line ${N.lines}, value is ${JSON.stringify(this.state.field.toString(a))}`,$?`(${$} bom)`:void 0],this.options,N,{field:this.state.field}));if(A!==void 0)return A}}else{this.state.quoting=!0,d+=D.length-1;continue}if(this.state.quoting===!1){const N=this.__isRecordDelimiter(O,y,d);if(N!==0){if(this.state.commenting&&this.state.wasQuoting===!1&&this.state.record.length===0&&this.state.field.length===0)this.info.comment_lines++;else{if(this.state.enabled===!1&&this.info.lines+(this.state.wasRowDelimiter===!0?1:0)>=_){this.state.enabled=!0,this.__resetField(),this.__resetRecord(),d+=N-1;continue}if(b===!0&&this.state.wasQuoting===!1&&this.state.record.length===0&&this.state.field.length===0){this.info.empty_lines++,d+=N-1;continue}this.info.bytes=this.state.bufBytesStart+d;const V=this.__onField();if(V!==void 0)return V;this.info.bytes=this.state.bufBytesStart+d+N;const G=this.__onRecord(s);if(G!==void 0)return G;if(C!==-1&&this.info.records>=C){this.state.stop=!0,r();return}}this.state.commenting=!1,d+=N-1;continue}if(this.state.commenting)continue;if(m!==null&&(c===!1||this.state.record.length===0&&this.state.field.length===0)&&this.__compareBytes(m,y,d,O)!==0){this.state.commenting=!0;continue}const $=this.__isDelimiter(y,d,O);if($!==0){this.info.bytes=this.state.bufBytesStart+d;const A=this.__onField();if(A!==void 0)return A;d+=$-1;continue}}}if(this.state.commenting===!1&&p!==0&&this.state.record_length+this.state.field.length>p)return this.__error(new S("CSV_MAX_RECORD_SIZE",["Max Record Size:","record exceed the maximum number of tolerated bytes",`of ${p}`,`at line ${this.info.lines}`],this.options,this.__infoField()));const E=g===!1||this.state.quoting===!0||this.state.field.length!==0||!this.__isCharTrimable(y,d),P=u===!1||this.state.wasQuoting===!1;if(E===!0&&P===!0)this.state.field.append(O);else{if(u===!0&&!this.__isCharTrimable(y,d))return this.__error(new S("CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE",["Invalid Closing Quote:","found non trimable byte after quote",`at line ${this.info.lines}`],this.options,this.__infoField()));E===!1&&(d+=this.__isCharTrimable(y,d)-1);continue}}if(i===!0)if(this.state.quoting===!0){const O=this.__error(new S("CSV_QUOTE_NOT_CLOSED",["Quote Not Closed:",`the parsing is finished with an opening quote at line ${this.info.lines}`],this.options,this.__infoField()));if(O!==void 0)return O}else if(this.state.wasQuoting===!0||this.state.record.length!==0||this.state.field.length!==0){this.info.bytes=this.state.bufBytesStart+d;const O=this.__onField();if(O!==void 0)return O;const E=this.__onRecord(s);if(E!==void 0)return E}else this.state.wasRowDelimiter===!0?this.info.empty_lines++:this.state.commenting===!0&&this.info.comment_lines++;else this.state.bufBytesStart+=d,this.state.previousBuf=y.slice(d);this.state.wasRowDelimiter===!0&&(this.info.lines++,this.state.wasRowDelimiter=!1)},__onRecord:function(n){const{columns:i,group_columns_by_name:s,encoding:r,info:o,from:c,relax_column_count:a,relax_column_count_less:_,relax_column_count_more:g,raw:p,skip_records_with_empty_values:L}=this.options,{enabled:R,record:u}=this.state;if(R===!1)return this.__resetRecord();const b=u.length;if(i===!0){if(L===!0&&ae(u)){this.__resetRecord();return}return this.__firstLineToColumns(u)}if(i===!1&&this.info.records===0&&(this.state.expectedRecordLength=b),b!==this.state.expectedRecordLength){const C=i===!1?new S("CSV_RECORD_INCONSISTENT_FIELDS_LENGTH",["Invalid Record Length:",`expect ${this.state.expectedRecordLength},`,`got ${b} on line ${this.info.lines}`],this.options,this.__infoField(),{record:u}):new S("CSV_RECORD_INCONSISTENT_COLUMNS",["Invalid Record Length:",`columns length is ${i.length},`,`got ${b} on line ${this.info.lines}`],this.options,this.__infoField(),{record:u});if(a===!0||_===!0&&b<this.state.expectedRecordLength||g===!0&&b>this.state.expectedRecordLength)this.info.invalid_field_length++,this.state.error=C;else{const w=this.__error(C);if(w)return w}}if(L===!0&&ae(u)){this.__resetRecord();return}if(this.state.recordHasError===!0){this.__resetRecord(),this.state.recordHasError=!1;return}if(this.info.records++,c===1||this.info.records>=c){const{objname:C}=this.options;if(i!==!1){const w={};for(let m=0,T=u.length;m<T;m++)i[m]===void 0||i[m].disabled||(s===!0&&w[i[m].name]!==void 0?Array.isArray(w[i[m].name])?w[i[m].name]=w[i[m].name].concat(u[m]):w[i[m].name]=[w[i[m].name],u[m]]:w[i[m].name]=u[m]);if(p===!0||o===!0){const m=Object.assign({record:w},p===!0?{raw:this.state.rawBuffer.toString(r)}:{},o===!0?{info:this.__infoRecord()}:{}),T=this.__push(C===void 0?m:[w[C],m],n);if(T)return T}else{const m=this.__push(C===void 0?w:[w[C],w],n);if(m)return m}}else if(p===!0||o===!0){const w=Object.assign({record:u},p===!0?{raw:this.state.rawBuffer.toString(r)}:{},o===!0?{info:this.__infoRecord()}:{}),m=this.__push(C===void 0?w:[u[C],w],n);if(m)return m}else{const w=this.__push(C===void 0?u:[u[C],u],n);if(w)return w}}this.__resetRecord()},__firstLineToColumns:function(n){const{firstLineToHeaders:i}=this.state;try{const s=i===void 0?n:i.call(null,n);if(!Array.isArray(s))return this.__error(new S("CSV_INVALID_COLUMN_MAPPING",["Invalid Column Mapping:","expect an array from column function,",`got ${JSON.stringify(s)}`],this.options,this.__infoField(),{headers:s}));const r=ue(s);this.state.expectedRecordLength=r.length,this.options.columns=r,this.__resetRecord();return}catch(s){return s}},__resetRecord:function(){this.options.raw===!0&&this.state.rawBuffer.reset(),this.state.error=void 0,this.state.record=[],this.state.record_length=0},__onField:function(){const{cast:n,encoding:i,rtrim:s,max_record_size:r}=this.options,{enabled:o,wasQuoting:c}=this.state;if(o===!1)return this.__resetField();let a=this.state.field.toString(i);if(s===!0&&c===!1&&(a=a.trimRight()),n===!0){const[_,g]=this.__cast(a);if(_!==void 0)return _;a=g}this.state.record.push(a),r!==0&&typeof a=="string"&&(this.state.record_length+=a.length),this.__resetField()},__resetField:function(){this.state.field.reset(),this.state.wasQuoting=!1},__push:function(n,i){const{on_record:s}=this.options;if(s!==void 0){const r=this.__infoRecord();try{n=s.call(null,n,r)}catch(o){return o}if(n==null)return}i(n)},__cast:function(n){const{columns:i,relax_column_count:s}=this.options;if(Array.isArray(i)===!0&&s&&this.options.columns.length<=this.state.record.length)return[void 0,void 0];if(this.state.castField!==null)try{const o=this.__infoField();return[void 0,this.state.castField.call(null,n,o)]}catch(o){return[o]}if(this.__isFloat(n))return[void 0,parseFloat(n)];if(this.options.cast_date!==!1){const o=this.__infoField();return[void 0,this.options.cast_date.call(null,n,o)]}return[void 0,n]},__isCharTrimable:function(n,i){return((r,o)=>{const{timchars:c}=this.state;e:for(let a=0;a<c.length;a++){const _=c[a];for(let g=0;g<_.length;g++)if(_[g]!==r[o+g])continue e;return _.length}return 0})(n,i)},__isFloat:function(n){return n-parseFloat(n)+1>=0},__compareBytes:function(n,i,s,r){if(n[0]!==r)return 0;const o=n.length;for(let c=1;c<o;c++)if(n[c]!==i[s+c])return 0;return o},__isDelimiter:function(n,i,s){const{delimiter:r,ignore_last_delimiters:o}=this.options;if(o===!0&&this.state.record.length===this.options.columns.length-1)return 0;if(o!==!1&&typeof o=="number"&&this.state.record.length===o-1)return 0;e:for(let c=0;c<r.length;c++){const a=r[c];if(a[0]===s){for(let _=1;_<a.length;_++)if(a[_]!==n[i+_])continue e;return a.length}}return 0},__isRecordDelimiter:function(n,i,s){const{record_delimiter:r}=this.options,o=r.length;e:for(let c=0;c<o;c++){const a=r[c],_=a.length;if(a[0]===n){for(let g=1;g<_;g++)if(a[g]!==i[s+g])continue e;return a.length}}return 0},__isEscape:function(n,i,s){const{escape:r}=this.options;if(r===null)return!1;const o=r.length;if(r[0]===s){for(let c=0;c<o;c++)if(r[c]!==n[i+c])return!1;return!0}return!1},__isQuote:function(n,i){const{quote:s}=this.options;if(s===null)return!1;const r=s.length;for(let o=0;o<r;o++)if(s[o]!==n[i+o])return!1;return!0},__autoDiscoverRecordDelimiter:function(n,i){const{encoding:s}=this.options,r=[Buffer.from(`\r
`,s),Buffer.from(`
`,s),Buffer.from("\r",s)];e:for(let o=0;o<r.length;o++){const c=r[o].length;for(let a=0;a<c;a++)if(r[o][a]!==n[i+a])continue e;return this.options.record_delimiter.push(r[o]),this.state.recordDelimiterMaxLength=r[o].length,r[o].length}return 0},__error:function(n){const{encoding:i,raw:s,skip_records_with_error:r}=this.options,o=typeof n=="string"?new Error(n):n;if(r){if(this.state.recordHasError=!0,this.options.on_skip!==void 0)try{this.options.on_skip(o,s?this.state.rawBuffer.toString(i):void 0)}catch(c){return c}return}else return o},__infoDataSet:function(){return{...this.info,columns:this.options.columns}},__infoRecord:function(){const{columns:n,raw:i,encoding:s}=this.options;return{...this.__infoDataSet(),error:this.state.error,header:n===!0,index:this.state.record.length,raw:i?this.state.rawBuffer.toString(s):void 0}},__infoField:function(){const{columns:n}=this.options,i=Array.isArray(n);return{...this.__infoRecord(),column:i===!0?n.length>this.state.record.length?n[this.state.record.length].name:null:this.state.record.length,quoting:this.state.wasQuoting}}}},de=function(t,e={}){typeof t=="string"&&(t=Buffer.from(t));const l=e&&e.objname?{}:[],n=Oe(e),i=o=>{n.options.objname===void 0?l.push(o):l[o[0]]=o[1]},s=()=>{},r=n.parse(t,!0,i,s);if(r!==void 0)throw r;return l};process.env.DIST_ELECTRON=k.join(__dirname,"../dist-electron");process.env.DIST=k.join(__dirname,"../dist");process.env.PUBLIC=process.env.VITE_DEV_SERVER_URL?k.join(process.env.DIST_ELECTRON,"../public"):process.env.DIST;let h=null,f=null;const H="https://partner.steampowered.com/",ee="https://partner.steampowered.com/nav_games.php",ve=/partner\.steampowered\.com\/app\/details\/(\d+)/,Ne=/partner\.steampowered\.com\/nav_games\.php(?:\?|$)/;let v=null,j=!1;function he(){const t=process.platform==="win32"?"icon.ico":"icon.png";h=new x.BrowserWindow({width:1200,height:800,icon:k.join(process.env.PUBLIC??"",t),webPreferences:{preload:k.join(__dirname,"../dist-electron/preload.js"),nodeIntegration:!0,contextIsolation:!1},backgroundColor:"#000000",titleBarStyle:"hiddenInset",trafficLightPosition:{x:12,y:12}}),h.webContents.setWindowOpenHandler(({url:e})=>(e.startsWith("http")&&x.shell.openExternal(e),{action:"deny"})),h.setMenuBarVisibility(!1),h.webContents.on("did-finish-load",()=>{h?.webContents.send("main-process-message",new Date().toLocaleString()),h?.webContents.send("dashboard-visibility",K)}),process.env.VITE_DEV_SERVER_URL?h.loadURL(process.env.VITE_DEV_SERVER_URL):h.loadFile(k.join(process.env.DIST??"","index.html")),Te(),oe()}function oe(){h&&(v=new x.BrowserView({webPreferences:{nodeIntegration:!1,contextIsolation:!0}}))}function Te(){if(!h)return;f=new x.BrowserView({webPreferences:{preload:k.join(__dirname,"../dist-electron/steam-preload.js"),nodeIntegration:!0,contextIsolation:!1,sandbox:!1}}),f.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),h.setBrowserView(f);const t=h.getContentBounds();f.setBounds({x:0,y:0,width:t.width,height:t.height}),h.on("resize",()=>{if(f&&!K){const e=h?.getContentBounds();e&&f.setBounds({x:0,y:0,width:e.width,height:e.height})}}),f.webContents.loadURL(H),f.webContents.on("did-finish-load",()=>{X()}),f.webContents.on("did-navigate",()=>{X()}),f.webContents.on("did-navigate-in-page",()=>{X()}),f.webContents.on("did-fail-load",(e,l,n,i,s)=>{s&&(console.error("Steam View failed to load:",l,n,i),l!==-3&&(U(!1),setTimeout(()=>{!f||f.webContents.isDestroyed()||f.webContents.loadURL(H)},1500)))})}let K=!1,ce=0,Z=0,z=!1;async function X(){if(!f||f.webContents.isDestroyed())return;const t=f.webContents.getURL();if(console.log("Current URL:",t),t.includes("/login/")||t.includes("login.steampowered.com")){console.log("Login page detected. Hiding Dashboard to allow login."),U(!1),j=!1,z=!1,h?.webContents.send("steam-target-detected",!1);return}if(t===H||t.startsWith(`${H}home`)){console.log("Steam root/home detected."),U(!1),j=!1,!z&&f&&!f.webContents.isDestroyed()&&(z=!0,f.webContents.loadURL(ee));return}const e=ve.test(t),l=Ne.test(t);if(console.log(`URL Analysis: isTarget=${e}, isAllProducts=${l}`),e){z=!1,console.log("Target URL detected! Showing Dashboard option."),Ve(),console.log("Sending show-dashboard-button to Steam View"),setTimeout(()=>{!f||f.webContents.isDestroyed()||f.webContents.send("show-dashboard-button",!0)},500),Ue();const n=t.match(/app\/details\/(\d+)/),i=n?n[1]:null;h?.webContents.send("steam-target-detected",i),i&&(Ee(i),Ae(i))}else if(l){const n=await f.webContents.executeJavaScript(`
      (function() {
        const text = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase()
        const gameLinks = document.querySelectorAll('a[href*="/app/details/"]').length
        const hasNotFound = text.includes('file not found') || text.includes('not found')
        return { gameLinks, hasNotFound }
      })()
    `).catch(()=>({gameLinks:0,hasNotFound:!1}));if(n.hasNotFound||n.gameLinks===0){U(!1),j=!1,h?.webContents.send("steam-target-detected",!1),t.includes("/nav_games.php")&&f&&!f.webContents.isDestroyed()&&f.webContents.loadURL(H);return}z=!1,console.log("All Products URL detected! Showing Portfolio Dashboard."),$e(),console.log("Sending show-dashboard-button to Steam View for Portfolio"),setTimeout(()=>{!f||f.webContents.isDestroyed()||f.webContents.send("show-dashboard-button",!0)},500),h?.webContents.send("steam-target-detected","portfolio"),j||(console.log("Auto-opening dashboard for Portfolio view"),j=!0,U(!0))}else console.log("No matching pattern. Keeping dashboard hidden."),h?.webContents.send("steam-target-detected",!1)}const Le=360*60*1e3,te=k.join(x.app.getPath("userData"),"steam-history.json"),ne=k.join(x.app.getPath("userData"),"steam-wishlist.json");function me(){try{if(B.existsSync(te)){const t=B.readFileSync(te,"utf-8");return JSON.parse(t)}}catch(t){console.error("Failed to load history store:",t)}return{}}function Re(t){try{B.writeFileSync(te,JSON.stringify(t,null,2))}catch(e){console.error("Failed to save history store:",e)}}function ie(){try{if(B.existsSync(ne)){const t=B.readFileSync(ne,"utf-8");return JSON.parse(t)}}catch(t){console.error("Failed to load wishlist store:",t)}return{}}function De(t){try{B.writeFileSync(ne,JSON.stringify(t,null,2))}catch(e){console.error("Failed to save wishlist store:",e)}}function Ee(t){if(!v&&(oe(),!v))return;const e=Date.now(),n=me()[t];if(n&&n.data.length>0&&(console.log(`Sending cached history for ${t} (${n.data.length} records)`),h?.webContents.send("steam-history-update",{appId:t,history:n.data}),n.lastUpdated&&e-n.lastUpdated<Le)){console.log(`Skipping history fetch for ${t} (cached & fresh)`);return}console.log(`Starting history fetch for ${t}...`);const r=`https://partner.steampowered.com/app/details/${t}/?dateStart=2000-01-01&dateEnd=${(_=>_.toISOString().split("T")[0])(new Date)}`;console.log(`Loading history URL: ${r}`),h&&(h.addBrowserView(v),v.setBounds({x:0,y:0,width:0,height:0}));const o=++ce,c=v.webContents.id,a=(_,g,p)=>{if(o!==ce||!v||v.webContents.isDestroyed()||p.id!==c||!g.getFilename().toLowerCase().endsWith(".csv"))return;const R=k.join(x.app.getPath("temp"),`steam_history_${t}_${Date.now()}.csv`);g.setSavePath(R),g.once("done",(u,b)=>{x.session.defaultSession.off("will-download",a),b==="completed"?(console.log("Download completed:",R),ke(t,R)):console.log(`Download failed: ${b}`)})};x.session.defaultSession.on("will-download",a),v.webContents.loadURL(r),v.webContents.once("did-finish-load",async()=>{console.log("History page loaded. Triggering CSV download..."),setTimeout(async()=>{const _=`
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
            `;try{if(!v||v.webContents.isDestroyed()){x.session.defaultSession.off("will-download",a);return}await v.webContents.executeJavaScript(_)?console.log("CSV download triggered successfully."):(console.error("Could not find CSV download button/form."),x.session.defaultSession.off("will-download",a))}catch(g){console.error("Failed to trigger CSV download:",g),x.session.defaultSession.off("will-download",a)}},3e3)})}function ke(t,e){try{const n=B.readFileSync(e,"utf-8").split(`
`);let i=0;for(let a=0;a<Math.min(10,n.length);a++)if(n[a].toLowerCase().includes("date")&&n[a].toLowerCase().includes("units")){i=a;break}const s=n.slice(i).join(`
`),r=de(s,{columns:!0,skip_empty_lines:!0,trim:!0}),o=[];if(r.length>0){const a=Object.keys(r[0]),_=a.find(p=>p.toLowerCase().includes("date")),g=a.find(p=>p.toLowerCase().includes("total units")||p.toLowerCase().includes("units"));if(_&&g)for(const p of r){const L=p[_],R=p[g];if(L&&R){const u=parseInt(R.replace(/,/g,""))||0;let b=L;const C=new Date(L);isNaN(C.getTime())||(b=C.toISOString().split("T")[0]),o.push({date:b,value:u})}}}o.sort((a,_)=>new Date(a.date).getTime()-new Date(_.date).getTime());const c=me();c[t]={lastUpdated:Date.now(),data:o},Re(c),console.log(`Processed ${o.length} history records for ${t}.`),h?.webContents.send("steam-history-update",{appId:t,history:o}),B.unlinkSync(e)}catch(l){console.error("Error processing history CSV:",l)}}function Ae(t){if(!v&&(oe(),!v))return;const l=ie()[t];l&&l.data.length>0&&h?.webContents.send("steam-wishlist-update",{appId:t,wishlist:l.data,currentOutstanding:l.currentOutstanding??null}),h&&(h.addBrowserView(v),v.setBounds({x:0,y:0,width:0,height:0}));const n=++Z,i=`https://partner.steampowered.com/app/wishlist/${t}/`;v.webContents.loadURL(i),v.webContents.once("did-finish-load",async()=>{setTimeout(async()=>{try{if(!v||v.webContents.isDestroyed()||n!==Z)return;const s=await v.webContents.executeJavaScript(`
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
                `);console.log(`[wishlist] Meta for ${t}:`,s);const r=s?.firstDate||"2000-01-01",o=new Date().toISOString().split("T")[0],c=`https://partner.steampowered.com/report_csv.php?file=SteamWishlists_${t}_${r}_to_${o}&params=query=QueryWishlistActionsForCSV^appID=${t}^dateStart=${r}^dateEnd=${o}^interpreter=WishlistReportInterpreter`;console.log(`[wishlist] CSV URL for ${t}: ${c}`);const a=await v.webContents.executeJavaScript(`
                    (async function() {
                        const response = await fetch(${JSON.stringify(c)}, { credentials: 'include' })
                        if (!response.ok) return ''
                        return await response.text()
                    })()
                `);if(n!==Z)return;Be(t,a||"",s?.currentOutstanding??null)}catch(s){console.error("Failed to trigger wishlist csv download:",s)}},2e3)})}function Be(t,e,l){try{const i=ie()[t]?.currentOutstanding??null,s=l??i;if(!e||e.includes("Steamworks Product Data login")){h?.webContents.send("steam-wishlist-update",{appId:t,wishlist:[],currentOutstanding:s});return}const r=e.split(/\r?\n/).map(u=>u.trimEnd());let o=",";r[0]&&r[0].toLowerCase().startsWith("sep=")&&(o=r[0].slice(4).trim()||",");let c=-1;for(let u=0;u<Math.min(60,r.length);u++){const b=r[u].toLowerCase();if(b.includes("date")&&(b.includes("wishlist")||b.includes("add")||b.includes("outstanding")||b.includes("balance"))){c=u;break}}if(c===-1){console.error(`[wishlist] Header not found for ${t}. Preview:`,r.slice(0,8).join(" | ")),h?.webContents.send("steam-wishlist-update",{appId:t,wishlist:[],currentOutstanding:s});return}const a=r.slice(c).join(`
`),_=de(a,{columns:!0,skip_empty_lines:!0,trim:!0,delimiter:o,relax_column_count:!0,skip_records_with_error:!0}),g=u=>{if(!u)return 0;const b=u.trim();if(!b)return 0;const C=b.startsWith("(")&&b.endsWith(")"),w=b.replace(/[(),]/g,""),m=parseInt(w,10)||0;return C?-m:m},p=[];if(_.length>0){const u=Object.keys(_[0]),b=u.find(I=>I.toLowerCase().includes("date")),C=u.find(I=>I.toLowerCase().includes("add")),w=u.find(I=>I.toLowerCase().includes("delet")),m=u.find(I=>I.toLowerCase().includes("purchase")),T=u.find(I=>I.toLowerCase().includes("gift")),D=u.find(I=>I.toLowerCase().includes("outstanding")||I.toLowerCase().includes("balance")),q=u.find(I=>I.toLowerCase().includes("net"));if(b)for(const I of _){const M=I[b],Q=new Date(M);if(isNaN(Q.getTime()))continue;const Y=Q.toISOString().split("T")[0],y=Math.abs(g(C?I[C]:void 0)),F=-Math.abs(g(w?I[w]:void 0)),d=-Math.abs(g(m?I[m]:void 0)),O=-Math.abs(g(T?I[T]:void 0)),E=g(D?I[D]:void 0),P=q?g(I[q]):y+F+d+O;p.push({date:Y,additions:y,deletions:F,purchases:d,gifts:O,balance:E,net:P})}}if(p.sort((u,b)=>new Date(u.date).getTime()-new Date(b.date).getTime()),p.length>0){let u=0;for(const w of p)u+=w.net,w.balance=u;const b=p[p.length-1].balance,C=s??(b>0?b:null);if(C!==null){const w=C-p[p.length-1].balance;for(const m of p)m.balance+=w}}const L=ie(),R=s??(p.length>0?p[p.length-1].balance:null);L[t]={lastUpdated:Date.now(),data:p,currentOutstanding:R},De(L),h?.webContents.send("steam-wishlist-update",{appId:t,wishlist:p,currentOutstanding:R})}catch(n){console.error("Error processing wishlist CSV:",n)}}async function $e(){if(!f||f.webContents.isDestroyed())return;const t=`
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
   `;try{const e=await f.webContents.executeJavaScript(t);console.log("Scraped Portfolio Data:",e),h?.webContents.send("steam-data-update",e)}catch(e){console.error("Portfolio Scraping failed:",e)}}async function Ve(){if(!f)return;const e=f.webContents.getURL().match(/app\/details\/(\d+)/),l=e?e[1]:null,n=`
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
  `;try{const i=await f.webContents.executeJavaScript(n);l&&(i.appId=l),console.log("Scraped Data:",i),h?.webContents.send("steam-data-update",i)}catch(i){console.error("Scraping failed:",i)}}x.ipcMain.on("navigate-to-app",(t,e)=>{if(!f)return;const l=`https://partner.steampowered.com/app/details/${e}/`;console.log(`Navigating to app: ${e} -> ${l}`),f.webContents.loadURL(l)});x.ipcMain.on("navigate-to-portfolio",()=>{f&&(console.log(`Navigating back to portfolio: ${ee}`),f.webContents.loadURL(ee))});x.ipcMain.on("logout",()=>{if(!f)return;const t="https://partner.steampowered.com/login/logout";console.log(`Logging out -> ${t}`),U(!1),f.webContents.loadURL(t)});x.ipcMain.on("toggle-dashboard",(t,e)=>{U(e)});x.ipcMain.on("request-visibility-state",()=>{h&&!h.webContents.isDestroyed()&&h.webContents.send("dashboard-visibility",K)});function U(t){if(K=t,!(!h||!f||f.webContents.isDestroyed()))if(t)f.setBounds({x:0,y:0,width:0,height:0}),h.webContents.isDestroyed()||h.webContents.send("dashboard-visibility",!0);else{const e=h.getContentBounds();f.setBounds({x:0,y:0,width:e.width,height:e.height}),h.webContents.isDestroyed()||h.webContents.send("dashboard-visibility",!1)}}let W=null;function Ue(){W||(console.log("Starting auto-refresh loop (every 5 minutes)"),W=setInterval(()=>{console.log("Auto-refreshing data..."),f&&!f.webContents.isDestroyed()?f.webContents.reloadIgnoringCache():(W&&clearInterval(W),W=null)},300*1e3))}x.ipcMain.on("refresh-data",()=>{console.log("Manual refresh requested"),f&&f.webContents.reloadIgnoringCache()});x.app.whenReady().then(he);x.app.on("window-all-closed",()=>{h=null,process.platform!=="darwin"&&x.app.quit()});x.app.on("activate",()=>{x.BrowserWindow.getAllWindows().length===0&&he()});x.ipcMain.handle("check-for-update",async()=>{try{const t="https://github.com/the-super-engine/steam-sales-dashboard/tags",e=x.app.getVersion();console.log(`Checking for updates... Current version: ${e}`);const l=x.net.request(t);return new Promise(n=>{l.on("response",i=>{let s="";i.on("data",r=>{s+=r.toString()}),i.on("end",()=>{const r=/v(\d+\.\d+\.\d+)/g;let o,c="0.0.0";for(;(o=r.exec(s))!==null;){const _=o[1];fe(_,c)&&(c=_)}const a=fe(c,e);console.log(`Update check result: hasUpdate=${a}, latest=${c}`),n({hasUpdate:a,latestVersion:c,currentVersion:e,releasesUrl:"https://github.com/the-super-engine/steam-sales-dashboard/releases"})})}),l.on("error",i=>{console.error("Update check failed:",i),n({hasUpdate:!1,error:i.message})}),l.end()})}catch(t){return console.error("Update check error:",t),{hasUpdate:!1,error:t instanceof Error?t.message:String(t)}}});function fe(t,e){const l=s=>s.trim().split(".").map(r=>parseInt(r,10)||0),n=l(t),i=l(e);for(let s=0;s<Math.max(n.length,i.length);s++){const r=n[s]||0,o=i[s]||0;if(r>o)return!0;if(r<o)return!1}return!1}
