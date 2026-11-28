(function() {
	var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, o = Object.getPrototypeOf, i = Object.prototype.hasOwnProperty, a = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (a, s, l) => (l = null != a ? e(o(a)) : {}, ((e, o, a, s) => {
		if (o && "object" == typeof o || "function" == typeof o) for (var l, c = r(o), u = 0, d = c.length; u < d; u++) l = c[u], i.call(e, l) || l === a || t(e, l, {
			get: ((e) => o[e]).bind(null, l),
			enumerable: !(s = n(o, l)) || s.enumerable
		});
		return e;
	})(!s && a && a.__esModule && i.call(a, "default") ? l : t(l, "default", {
		value: a,
		enumerable: !0
	}), a)), l = a((e, t) => {
		/*!
		
		JSZip v3.10.2 - A JavaScript class for generating and reading zip files
		<http://stuartk.com/jszip>
		
		(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
		Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
		
		JSZip uses the library pako released under the MIT license :
		https://github.com/nodeca/pako/blob/main/LICENSE
		*/
		(function(n) {
			"object" == typeof e && void 0 !== t ? t.exports = n() : "function" == typeof define && define.amd ? define([], n) : ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = n();
		})(function() {
			return function e(t, n, r) {
				function o(a, s) {
					if (!n[a]) {
						if (!t[a]) {
							var l = "function" == typeof require && require;
							if (!s && l) return l(a, !0);
							if (i) return i(a, !0);
							var c = /* @__PURE__ */ new Error("Cannot find module '" + a + "'");
							throw c.code = "MODULE_NOT_FOUND", c;
						}
						var u = n[a] = { exports: {} };
						t[a][0].call(u.exports, function(e) {
							return o(t[a][1][e] || e);
						}, u, u.exports, e, t, n, r);
					}
					return n[a].exports;
				}
				for (var i = "function" == typeof require && require, a = 0; a < r.length; a++) o(r[a]);
				return o;
			}({
				1: [function(e, t, n) {
					"use strict";
					var r = e("./utils"), o = e("./support"), i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
					n.encode = function(e) {
						for (var t, n, o, a, s, l, c, u = [], d = 0, p = e.length, f = p, h = "string" !== r.getTypeOf(e); d < e.length;) f = p - d, o = h ? (t = e[d++], n = d < p ? e[d++] : 0, d < p ? e[d++] : 0) : (t = e.charCodeAt(d++), n = d < p ? e.charCodeAt(d++) : 0, d < p ? e.charCodeAt(d++) : 0), a = t >> 2, s = (3 & t) << 4 | n >> 4, l = 1 < f ? (15 & n) << 2 | o >> 6 : 64, c = 2 < f ? 63 & o : 64, u.push(i.charAt(a) + i.charAt(s) + i.charAt(l) + i.charAt(c));
						return u.join("");
					}, n.decode = function(e) {
						var t, n, r, a, s, l, c = 0, u = 0;
						if (e.substr(0, 5) === "data:") throw new Error("Invalid base64 input, it looks like a data url.");
						var p, f = 3 * (e = e.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
						if (e.charAt(e.length - 1) === i.charAt(64) && f--, e.charAt(e.length - 2) === i.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
						for (p = o.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); c < e.length;) t = i.indexOf(e.charAt(c++)) << 2 | (a = i.indexOf(e.charAt(c++))) >> 4, n = (15 & a) << 4 | (s = i.indexOf(e.charAt(c++))) >> 2, r = (3 & s) << 6 | (l = i.indexOf(e.charAt(c++))), p[u++] = t, 64 !== s && (p[u++] = n), 64 !== l && (p[u++] = r);
						return p;
					};
				}, {
					"./support": 30,
					"./utils": 32
				}],
				2: [function(e, t, n) {
					"use strict";
					var r = e("./external"), o = e("./stream/DataWorker"), i = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
					function s(e, t, n, r, o) {
						this.compressedSize = e, this.uncompressedSize = t, this.crc32 = n, this.compression = r, this.compressedContent = o;
					}
					s.prototype = {
						getContentWorker: function() {
							var e = new o(r.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t = this;
							return e.on("end", function() {
								if (this.streamInfo.data_length !== t.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
							}), e;
						},
						getCompressedWorker: function() {
							return new o(r.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
						}
					}, s.createWorkerFrom = function(e, t, n) {
						return e.pipe(new i()).pipe(new a("uncompressedSize")).pipe(t.compressWorker(n)).pipe(new a("compressedSize")).withStreamInfo("compression", t);
					}, t.exports = s;
				}, {
					"./external": 6,
					"./stream/Crc32Probe": 25,
					"./stream/DataLengthProbe": 26,
					"./stream/DataWorker": 27
				}],
				3: [function(e, t, n) {
					"use strict";
					var r = e("./stream/GenericWorker");
					n.STORE = {
						magic: "\0\0",
						compressWorker: function() {
							return new r("STORE compression");
						},
						uncompressWorker: function() {
							return new r("STORE decompression");
						}
					}, n.DEFLATE = e("./flate");
				}, {
					"./flate": 7,
					"./stream/GenericWorker": 28
				}],
				4: [function(e, t, n) {
					"use strict";
					var r = e("./utils"), o = function() {
						for (var e, t = [], n = 0; n < 256; n++) {
							e = n;
							for (var r = 0; r < 8; r++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
							t[n] = e;
						}
						return t;
					}();
					t.exports = function(e, t) {
						return void 0 !== e && e.length ? "string" !== r.getTypeOf(e) ? function(e, t, n) {
							var r = o, i = 0 + n;
							e ^= -1;
							for (var a = 0; a < i; a++) e = e >>> 8 ^ r[255 & (e ^ t[a])];
							return -1 ^ e;
						}(0 | t, e, e.length) : function(e, t, n) {
							var r = o, i = 0 + n;
							e ^= -1;
							for (var a = 0; a < i; a++) e = e >>> 8 ^ r[255 & (e ^ t.charCodeAt(a))];
							return -1 ^ e;
						}(0 | t, e, e.length) : 0;
					};
				}, { "./utils": 32 }],
				5: [function(e, t, n) {
					"use strict";
					n.base64 = !1, n.binary = !1, n.dir = !1, n.createFolders = !0, n.date = null, n.compression = null, n.compressionOptions = null, n.comment = null, n.unixPermissions = null, n.dosPermissions = null;
				}, {}],
				6: [function(e, t, n) {
					"use strict";
					t.exports = { Promise: "undefined" != typeof Promise ? Promise : e("lie") };
				}, { lie: 37 }],
				7: [function(e, t, n) {
					"use strict";
					var r = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, o = e("pako"), i = e("./utils"), a = e("./stream/GenericWorker"), s = r ? "uint8array" : "array";
					function l(e, t) {
						a.call(this, "FlateWorker/" + e), this._pako = null, this._pakoAction = e, this._pakoOptions = t, this.meta = {};
					}
					n.magic = "\b\0", i.inherits(l, a), l.prototype.processChunk = function(e) {
						this.meta = e.meta, null === this._pako && this._createPako(), this._pako.push(i.transformTo(s, e.data), !1);
					}, l.prototype.flush = function() {
						a.prototype.flush.call(this), null === this._pako && this._createPako(), this._pako.push([], !0);
					}, l.prototype.cleanUp = function() {
						a.prototype.cleanUp.call(this), this._pako = null;
					}, l.prototype._createPako = function() {
						this._pako = new o[this._pakoAction]({
							raw: !0,
							level: this._pakoOptions.level || -1
						});
						var e = this;
						this._pako.onData = function(t) {
							e.push({
								data: t,
								meta: e.meta
							});
						};
					}, n.compressWorker = function(e) {
						return new l("Deflate", e);
					}, n.uncompressWorker = function() {
						return new l("Inflate", {});
					};
				}, {
					"./stream/GenericWorker": 28,
					"./utils": 32,
					pako: 38
				}],
				8: [function(e, t, n) {
					"use strict";
					function r(e, t) {
						var n, r = "";
						for (n = 0; n < t; n++) r += String.fromCharCode(255 & e), e >>>= 8;
						return r;
					}
					function o(e, t, n, o, a, u) {
						var d, p, f = e.file, h = e.compression, m = u !== s.utf8encode, g = i.transformTo("string", u(f.name)), w = i.transformTo("string", s.utf8encode(f.name)), b = f.comment, v = i.transformTo("string", u(b)), y = i.transformTo("string", s.utf8encode(b)), x = w.length !== f.name.length, S = y.length !== b.length, N = "", E = "", k = "", T = f.dir, I = f.date, _ = {
							crc32: 0,
							compressedSize: 0,
							uncompressedSize: 0
						};
						t && !n || (_.crc32 = e.crc32, _.compressedSize = e.compressedSize, _.uncompressedSize = e.uncompressedSize);
						var C = 0;
						t && (C |= 8), m || !x && !S || (C |= 2048);
						var A = 0, R = 0;
						T && (A |= 16), "UNIX" === a ? (R = 798, A |= function(e, t) {
							var n = e;
							return e || (n = t ? 16893 : 33204), (65535 & n) << 16;
						}(f.unixPermissions, T)) : (R = 20, A |= function(e) {
							return 63 & (e || 0);
						}(f.dosPermissions)), d = I.getUTCHours(), d <<= 6, d |= I.getUTCMinutes(), d <<= 5, d |= I.getUTCSeconds() / 2, p = I.getUTCFullYear() - 1980, p <<= 4, p |= I.getUTCMonth() + 1, p <<= 5, p |= I.getUTCDate(), x && (E = r(1, 1) + r(l(g), 4) + w, N += "up" + r(E.length, 2) + E), S && (k = r(1, 1) + r(l(v), 4) + y, N += "uc" + r(k.length, 2) + k);
						var $ = "";
						return $ += "\n\0", $ += r(C, 2), $ += h.magic, $ += r(d, 2), $ += r(p, 2), $ += r(_.crc32, 4), $ += r(_.compressedSize, 4), $ += r(_.uncompressedSize, 4), $ += r(g.length, 2), $ += r(N.length, 2), {
							fileRecord: c.LOCAL_FILE_HEADER + $ + g + N,
							dirRecord: c.CENTRAL_FILE_HEADER + r(R, 2) + $ + r(v.length, 2) + "\0\0\0\0" + r(A, 4) + r(o, 4) + g + N + v
						};
					}
					var i = e("../utils"), a = e("../stream/GenericWorker"), s = e("../utf8"), l = e("../crc32"), c = e("../signature");
					function u(e, t, n, r) {
						a.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t, this.zipPlatform = n, this.encodeFileName = r, this.streamFiles = e, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
					}
					i.inherits(u, a), u.prototype.push = function(e) {
						var t = e.meta.percent || 0, n = this.entriesCount, r = this._sources.length;
						this.accumulate ? this.contentBuffer.push(e) : (this.bytesWritten += e.data.length, a.prototype.push.call(this, {
							data: e.data,
							meta: {
								currentFile: this.currentFile,
								percent: n ? (t + 100 * (n - r - 1)) / n : 100
							}
						}));
					}, u.prototype.openedSource = function(e) {
						this.currentSourceOffset = this.bytesWritten, this.currentFile = e.file.name;
						var t = this.streamFiles && !e.file.dir;
						if (t) {
							var n = o(e, t, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
							this.push({
								data: n.fileRecord,
								meta: { percent: 0 }
							});
						} else this.accumulate = !0;
					}, u.prototype.closedSource = function(e) {
						this.accumulate = !1;
						var t = this.streamFiles && !e.file.dir, n = o(e, t, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
						if (this.dirRecords.push(n.dirRecord), t) this.push({
							data: function(e) {
								return c.DATA_DESCRIPTOR + r(e.crc32, 4) + r(e.compressedSize, 4) + r(e.uncompressedSize, 4);
							}(e),
							meta: { percent: 100 }
						});
						else for (this.push({
							data: n.fileRecord,
							meta: { percent: 0 }
						}); this.contentBuffer.length;) this.push(this.contentBuffer.shift());
						this.currentFile = null;
					}, u.prototype.flush = function() {
						for (var e = this.bytesWritten, t = 0; t < this.dirRecords.length; t++) this.push({
							data: this.dirRecords[t],
							meta: { percent: 100 }
						});
						var n = this.bytesWritten - e, o = function(e, t, n, o, a) {
							var s = i.transformTo("string", a(o));
							return c.CENTRAL_DIRECTORY_END + "\0\0\0\0" + r(e, 2) + r(e, 2) + r(t, 4) + r(n, 4) + r(s.length, 2) + s;
						}(this.dirRecords.length, n, e, this.zipComment, this.encodeFileName);
						this.push({
							data: o,
							meta: { percent: 100 }
						});
					}, u.prototype.prepareNextSource = function() {
						this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
					}, u.prototype.registerPrevious = function(e) {
						this._sources.push(e);
						var t = this;
						return e.on("data", function(e) {
							t.processChunk(e);
						}), e.on("end", function() {
							t.closedSource(t.previous.streamInfo), t._sources.length ? t.prepareNextSource() : t.end();
						}), e.on("error", function(e) {
							t.error(e);
						}), this;
					}, u.prototype.resume = function() {
						return !!a.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
					}, u.prototype.error = function(e) {
						var t = this._sources;
						if (!a.prototype.error.call(this, e)) return !1;
						for (var n = 0; n < t.length; n++) try {
							t[n].error(e);
						} catch (e) {}
						return !0;
					}, u.prototype.lock = function() {
						a.prototype.lock.call(this);
						for (var e = this._sources, t = 0; t < e.length; t++) e[t].lock();
					}, t.exports = u;
				}, {
					"../crc32": 4,
					"../signature": 23,
					"../stream/GenericWorker": 28,
					"../utf8": 31,
					"../utils": 32
				}],
				9: [function(e, t, n) {
					"use strict";
					var r = e("../compressions"), o = e("./ZipFileWorker");
					n.generateWorker = function(e, t, n) {
						var i = new o(t.streamFiles, n, t.platform, t.encodeFileName), a = 0;
						try {
							e.forEach(function(e, n) {
								a++;
								var o = function(e, t) {
									var n = e || t, o = r[n];
									if (!o) throw new Error(n + " is not a valid compression method !");
									return o;
								}(n.options.compression, t.compression), s = n.options.compressionOptions || t.compressionOptions || {}, l = n.dir, c = n.date;
								n._compressWorker(o, s).withStreamInfo("file", {
									name: e,
									dir: l,
									date: c,
									comment: n.comment || "",
									unixPermissions: n.unixPermissions,
									dosPermissions: n.dosPermissions
								}).pipe(i);
							}), i.entriesCount = a;
						} catch (e) {
							i.error(e);
						}
						return i;
					};
				}, {
					"../compressions": 3,
					"./ZipFileWorker": 8
				}],
				10: [function(e, t, n) {
					"use strict";
					function r() {
						if (!(this instanceof r)) return new r();
						if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
						this.files = Object.create(null), this.comment = null, this.root = "", this.clone = function() {
							var e = new r();
							for (var t in this) "function" != typeof this[t] && (e[t] = this[t]);
							return e;
						};
					}
					(r.prototype = e("./object")).loadAsync = e("./load"), r.support = e("./support"), r.defaults = e("./defaults"), r.version = "3.10.2", r.loadAsync = function(e, t) {
						return new r().loadAsync(e, t);
					}, r.external = e("./external"), t.exports = r;
				}, {
					"./defaults": 5,
					"./external": 6,
					"./load": 11,
					"./object": 15,
					"./support": 30
				}],
				11: [function(e, t, n) {
					"use strict";
					var r = e("./utils"), o = e("./external"), i = e("./utf8"), a = e("./zipEntries"), s = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
					function c(e) {
						return new o.Promise(function(t, n) {
							var r = e.decompressed.getContentWorker().pipe(new s());
							r.on("error", function(e) {
								n(e);
							}).on("end", function() {
								r.streamInfo.crc32 !== e.decompressed.crc32 ? n(/* @__PURE__ */ new Error("Corrupted zip : CRC32 mismatch")) : t();
							}).resume();
						});
					}
					t.exports = function(e, t) {
						var n = this;
						return t = r.extend(t || {}, {
							base64: !1,
							checkCRC32: !1,
							optimizedBinaryString: !1,
							createFolders: !1,
							decodeFileName: i.utf8decode
						}), l.isNode && l.isStream(e) ? o.Promise.reject(/* @__PURE__ */ new Error("JSZip can't accept a stream when loading a zip file.")) : r.prepareContent("the loaded zip file", e, !0, t.optimizedBinaryString, t.base64).then(function(e) {
							var n = new a(t);
							return n.load(e), n;
						}).then(function(e) {
							var n = [o.Promise.resolve(e)], r = e.files;
							if (t.checkCRC32) for (var i = 0; i < r.length; i++) n.push(c(r[i]));
							return o.Promise.all(n);
						}).then(function(e) {
							for (var o = e.shift(), i = o.files, a = 0; a < i.length; a++) {
								var s = i[a], l = s.fileNameStr, c = r.resolve(s.fileNameStr);
								n.file(c, s.decompressed, {
									binary: !0,
									optimizedBinaryString: !0,
									date: s.date,
									dir: s.dir,
									comment: s.fileCommentStr.length ? s.fileCommentStr : null,
									unixPermissions: s.unixPermissions,
									dosPermissions: s.dosPermissions,
									createFolders: t.createFolders
								}), s.dir || (n.file(c).unsafeOriginalName = l);
							}
							return o.zipComment.length && (n.comment = o.zipComment), n;
						});
					};
				}, {
					"./external": 6,
					"./nodejsUtils": 14,
					"./stream/Crc32Probe": 25,
					"./utf8": 31,
					"./utils": 32,
					"./zipEntries": 33
				}],
				12: [function(e, t, n) {
					"use strict";
					var r = e("../utils"), o = e("../stream/GenericWorker");
					function i(e, t) {
						o.call(this, "Nodejs stream input adapter for " + e), this._upstreamEnded = !1, this._bindStream(t);
					}
					r.inherits(i, o), i.prototype._bindStream = function(e) {
						var t = this;
						(this._stream = e).pause(), e.on("data", function(e) {
							t.push({
								data: e,
								meta: { percent: 0 }
							});
						}).on("error", function(e) {
							t.isPaused ? this.generatedError = e : t.error(e);
						}).on("end", function() {
							t.isPaused ? t._upstreamEnded = !0 : t.end();
						});
					}, i.prototype.pause = function() {
						return !!o.prototype.pause.call(this) && (this._stream.pause(), !0);
					}, i.prototype.resume = function() {
						return !!o.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
					}, t.exports = i;
				}, {
					"../stream/GenericWorker": 28,
					"../utils": 32
				}],
				13: [function(e, t, n) {
					"use strict";
					var r = e("readable-stream").Readable;
					function o(e, t, n) {
						r.call(this, t), this._helper = e;
						var o = this;
						e.on("data", function(e, t) {
							o.push(e) || o._helper.pause(), n && n(t);
						}).on("error", function(e) {
							o.emit("error", e);
						}).on("end", function() {
							o.push(null);
						});
					}
					e("../utils").inherits(o, r), o.prototype._read = function() {
						this._helper.resume();
					}, t.exports = o;
				}, {
					"../utils": 32,
					"readable-stream": 16
				}],
				14: [function(e, t, n) {
					"use strict";
					t.exports = {
						isNode: "undefined" != typeof Buffer,
						newBufferFrom: function(e, t) {
							if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e, t);
							if ("number" == typeof e) throw new Error("The \"data\" argument must not be a number");
							return new Buffer(e, t);
						},
						allocBuffer: function(e) {
							if (Buffer.alloc) return Buffer.alloc(e);
							var t = new Buffer(e);
							return t.fill(0), t;
						},
						isBuffer: function(e) {
							return Buffer.isBuffer(e);
						},
						isStream: function(e) {
							return e && "function" == typeof e.on && "function" == typeof e.pause && "function" == typeof e.resume;
						}
					};
				}, {}],
				15: [function(e, t, n) {
					"use strict";
					function r(e, t, n) {
						var r, o = i.getTypeOf(t), s = i.extend(n || {}, l);
						s.date = s.date || /* @__PURE__ */ new Date(), null !== s.compression && (s.compression = s.compression.toUpperCase()), "string" == typeof s.unixPermissions && (s.unixPermissions = parseInt(s.unixPermissions, 8)), s.unixPermissions && 16384 & s.unixPermissions && (s.dir = !0), s.dosPermissions && 16 & s.dosPermissions && (s.dir = !0), s.dir && (e = m(e)), s.createFolders && (r = h(e)) && g.call(this, r, !0);
						var d = "string" === o && !1 === s.binary && !1 === s.base64;
						n && void 0 !== n.binary || (s.binary = !d), (t instanceof c && 0 === t.uncompressedSize || s.dir || !t || 0 === t.length) && (s.base64 = !1, s.binary = !0, t = "", s.compression = "STORE", o = "string");
						var w = t instanceof c || t instanceof a ? t : p.isNode && p.isStream(t) ? new f(e, t) : i.prepareContent(e, t, s.binary, s.optimizedBinaryString, s.base64);
						var b = new u(e, w, s);
						this.files[e] = b;
					}
					var o = e("./utf8"), i = e("./utils"), a = e("./stream/GenericWorker"), s = e("./stream/StreamHelper"), l = e("./defaults"), c = e("./compressedObject"), u = e("./zipObject"), d = e("./generate"), p = e("./nodejsUtils"), f = e("./nodejs/NodejsStreamInputAdapter"), h = function(e) {
						"/" === e.slice(-1) && (e = e.substring(0, e.length - 1));
						var t = e.lastIndexOf("/");
						return 0 < t ? e.substring(0, t) : "";
					}, m = function(e) {
						return "/" !== e.slice(-1) && (e += "/"), e;
					}, g = function(e, t) {
						return t = void 0 !== t ? t : l.createFolders, e = m(e), this.files[e] || r.call(this, e, null, {
							dir: !0,
							createFolders: t
						}), this.files[e];
					};
					function w(e) {
						return "[object RegExp]" === Object.prototype.toString.call(e);
					}
					t.exports = {
						load: function() {
							throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
						},
						forEach: function(e) {
							var t, n, r;
							for (t in this.files) r = this.files[t], (n = t.slice(this.root.length, t.length)) && t.slice(0, this.root.length) === this.root && e(n, r);
						},
						filter: function(e) {
							var t = [];
							return this.forEach(function(n, r) {
								e(n, r) && t.push(r);
							}), t;
						},
						file: function(e, t, n) {
							if (1 !== arguments.length) return e = this.root + e, r.call(this, e, t, n), this;
							if (w(e)) {
								var o = e;
								return this.filter(function(e, t) {
									return !t.dir && o.test(e);
								});
							}
							var i = this.files[this.root + e];
							return i && !i.dir ? i : null;
						},
						folder: function(e) {
							if (!e) return this;
							if (w(e)) return this.filter(function(t, n) {
								return n.dir && e.test(t);
							});
							var t = this.root + e, n = g.call(this, t), r = this.clone();
							return r.root = n.name, r;
						},
						remove: function(e) {
							e = this.root + e;
							var t = this.files[e];
							if (t || ("/" !== e.slice(-1) && (e += "/"), t = this.files[e]), t && !t.dir) delete this.files[e];
							else for (var n = this.filter(function(t, n) {
								return n.name.slice(0, e.length) === e;
							}), r = 0; r < n.length; r++) delete this.files[n[r].name];
							return this;
						},
						generate: function() {
							throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
						},
						generateInternalStream: function(e) {
							var t, n = {};
							try {
								if ((n = i.extend(e || {}, {
									streamFiles: !1,
									compression: "STORE",
									compressionOptions: null,
									type: "",
									platform: "DOS",
									comment: null,
									mimeType: "application/zip",
									encodeFileName: o.utf8encode
								})).type = n.type.toLowerCase(), n.compression = n.compression.toUpperCase(), "binarystring" === n.type && (n.type = "string"), !n.type) throw new Error("No output type specified.");
								i.checkSupport(n.type), "darwin" !== n.platform && "freebsd" !== n.platform && "linux" !== n.platform && "sunos" !== n.platform || (n.platform = "UNIX"), "win32" === n.platform && (n.platform = "DOS");
								var r = n.comment || this.comment || "";
								t = d.generateWorker(this, n, r);
							} catch (e) {
								(t = new a("error")).error(e);
							}
							return new s(t, n.type || "string", n.mimeType);
						},
						generateAsync: function(e, t) {
							return this.generateInternalStream(e).accumulate(t);
						},
						generateNodeStream: function(e, t) {
							return (e = e || {}).type || (e.type = "nodebuffer"), this.generateInternalStream(e).toNodejsStream(t);
						}
					};
				}, {
					"./compressedObject": 2,
					"./defaults": 5,
					"./generate": 9,
					"./nodejs/NodejsStreamInputAdapter": 12,
					"./nodejsUtils": 14,
					"./stream/GenericWorker": 28,
					"./stream/StreamHelper": 29,
					"./utf8": 31,
					"./utils": 32,
					"./zipObject": 35
				}],
				16: [function(e, t, n) {
					"use strict";
					t.exports = e("stream");
				}, { stream: void 0 }],
				17: [function(e, t, n) {
					"use strict";
					var r = e("./DataReader");
					function o(e) {
						r.call(this, e);
						for (var t = 0; t < this.data.length; t++) e[t] = 255 & e[t];
					}
					e("../utils").inherits(o, r), o.prototype.byteAt = function(e) {
						return this.data[this.zero + e];
					}, o.prototype.lastIndexOfSignature = function(e) {
						for (var t = e.charCodeAt(0), n = e.charCodeAt(1), r = e.charCodeAt(2), o = e.charCodeAt(3), i = this.length - 4; 0 <= i; --i) if (this.data[i] === t && this.data[i + 1] === n && this.data[i + 2] === r && this.data[i + 3] === o) return i - this.zero;
						return -1;
					}, o.prototype.readAndCheckSignature = function(e) {
						var t = e.charCodeAt(0), n = e.charCodeAt(1), r = e.charCodeAt(2), o = e.charCodeAt(3), i = this.readData(4);
						return t === i[0] && n === i[1] && r === i[2] && o === i[3];
					}, o.prototype.readData = function(e) {
						if (this.checkOffset(e), 0 === e) return [];
						var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./DataReader": 18
				}],
				18: [function(e, t, n) {
					"use strict";
					var r = e("../utils");
					function o(e) {
						this.data = e, this.length = e.length, this.index = 0, this.zero = 0;
					}
					o.prototype = {
						checkOffset: function(e) {
							this.checkIndex(this.index + e);
						},
						checkIndex: function(e) {
							if (this.length < this.zero + e || e < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + e + "). Corrupted zip ?");
						},
						setIndex: function(e) {
							this.checkIndex(e), this.index = e;
						},
						skip: function(e) {
							this.setIndex(this.index + e);
						},
						byteAt: function() {},
						readInt: function(e) {
							var t, n = 0;
							for (this.checkOffset(e), t = this.index + e - 1; t >= this.index; t--) n = (n << 8) + this.byteAt(t);
							return this.index += e, n;
						},
						readString: function(e) {
							return r.transformTo("string", this.readData(e));
						},
						readData: function() {},
						lastIndexOfSignature: function() {},
						readAndCheckSignature: function() {},
						readDate: function() {
							var e = this.readInt(4);
							return new Date(Date.UTC(1980 + (e >> 25 & 127), (e >> 21 & 15) - 1, e >> 16 & 31, e >> 11 & 31, e >> 5 & 63, (31 & e) << 1));
						}
					}, t.exports = o;
				}, { "../utils": 32 }],
				19: [function(e, t, n) {
					"use strict";
					var r = e("./Uint8ArrayReader");
					function o(e) {
						r.call(this, e);
					}
					e("../utils").inherits(o, r), o.prototype.readData = function(e) {
						this.checkOffset(e);
						var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./Uint8ArrayReader": 21
				}],
				20: [function(e, t, n) {
					"use strict";
					var r = e("./DataReader");
					function o(e) {
						r.call(this, e);
					}
					e("../utils").inherits(o, r), o.prototype.byteAt = function(e) {
						return this.data.charCodeAt(this.zero + e);
					}, o.prototype.lastIndexOfSignature = function(e) {
						return this.data.lastIndexOf(e) - this.zero;
					}, o.prototype.readAndCheckSignature = function(e) {
						return e === this.readData(4);
					}, o.prototype.readData = function(e) {
						this.checkOffset(e);
						var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./DataReader": 18
				}],
				21: [function(e, t, n) {
					"use strict";
					var r = e("./ArrayReader");
					function o(e) {
						r.call(this, e);
					}
					e("../utils").inherits(o, r), o.prototype.readData = function(e) {
						if (this.checkOffset(e), 0 === e) return /* @__PURE__ */ new Uint8Array(0);
						var t = this.data.subarray(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./ArrayReader": 17
				}],
				22: [function(e, t, n) {
					"use strict";
					var r = e("../utils"), o = e("../support"), i = e("./ArrayReader"), a = e("./StringReader"), s = e("./NodeBufferReader"), l = e("./Uint8ArrayReader");
					t.exports = function(e) {
						var t = r.getTypeOf(e);
						return r.checkSupport(t), "string" !== t || o.uint8array ? "nodebuffer" === t ? new s(e) : o.uint8array ? new l(r.transformTo("uint8array", e)) : new i(r.transformTo("array", e)) : new a(e);
					};
				}, {
					"../support": 30,
					"../utils": 32,
					"./ArrayReader": 17,
					"./NodeBufferReader": 19,
					"./StringReader": 20,
					"./Uint8ArrayReader": 21
				}],
				23: [function(e, t, n) {
					"use strict";
					n.LOCAL_FILE_HEADER = "PK", n.CENTRAL_FILE_HEADER = "PK", n.CENTRAL_DIRECTORY_END = "PK", n.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", n.ZIP64_CENTRAL_DIRECTORY_END = "PK", n.DATA_DESCRIPTOR = "PK\x07\b";
				}, {}],
				24: [function(e, t, n) {
					"use strict";
					var r = e("./GenericWorker"), o = e("../utils");
					function i(e) {
						r.call(this, "ConvertWorker to " + e), this.destType = e;
					}
					o.inherits(i, r), i.prototype.processChunk = function(e) {
						this.push({
							data: o.transformTo(this.destType, e.data),
							meta: e.meta
						});
					}, t.exports = i;
				}, {
					"../utils": 32,
					"./GenericWorker": 28
				}],
				25: [function(e, t, n) {
					"use strict";
					var r = e("./GenericWorker"), o = e("../crc32");
					function i() {
						r.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
					}
					e("../utils").inherits(i, r), i.prototype.processChunk = function(e) {
						this.streamInfo.crc32 = o(e.data, this.streamInfo.crc32 || 0), this.push(e);
					}, t.exports = i;
				}, {
					"../crc32": 4,
					"../utils": 32,
					"./GenericWorker": 28
				}],
				26: [function(e, t, n) {
					"use strict";
					var r = e("../utils"), o = e("./GenericWorker");
					function i(e) {
						o.call(this, "DataLengthProbe for " + e), this.propName = e, this.withStreamInfo(e, 0);
					}
					r.inherits(i, o), i.prototype.processChunk = function(e) {
						if (e) {
							var t = this.streamInfo[this.propName] || 0;
							this.streamInfo[this.propName] = t + e.data.length;
						}
						o.prototype.processChunk.call(this, e);
					}, t.exports = i;
				}, {
					"../utils": 32,
					"./GenericWorker": 28
				}],
				27: [function(e, t, n) {
					"use strict";
					var r = e("../utils"), o = e("./GenericWorker");
					function i(e) {
						o.call(this, "DataWorker");
						var t = this;
						this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, e.then(function(e) {
							t.dataIsReady = !0, t.data = e, t.max = e && e.length || 0, t.type = r.getTypeOf(e), t.isPaused || t._tickAndRepeat();
						}, function(e) {
							t.error(e);
						});
					}
					r.inherits(i, o), i.prototype.cleanUp = function() {
						o.prototype.cleanUp.call(this), this.data = null;
					}, i.prototype.resume = function() {
						return !!o.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, r.delay(this._tickAndRepeat, [], this)), !0);
					}, i.prototype._tickAndRepeat = function() {
						this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (r.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
					}, i.prototype._tick = function() {
						if (this.isPaused || this.isFinished) return !1;
						var e = null, t = Math.min(this.max, this.index + 16384);
						if (this.index >= this.max) return this.end();
						switch (this.type) {
							case "string":
								e = this.data.substring(this.index, t);
								break;
							case "uint8array":
								e = this.data.subarray(this.index, t);
								break;
							case "array":
							case "nodebuffer": e = this.data.slice(this.index, t);
						}
						return this.index = t, this.push({
							data: e,
							meta: { percent: this.max ? this.index / this.max * 100 : 0 }
						});
					}, t.exports = i;
				}, {
					"../utils": 32,
					"./GenericWorker": 28
				}],
				28: [function(e, t, n) {
					"use strict";
					function r(e) {
						this.name = e || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
							data: [],
							end: [],
							error: []
						}, this.previous = null;
					}
					r.prototype = {
						push: function(e) {
							this.emit("data", e);
						},
						end: function() {
							if (this.isFinished) return !1;
							this.flush();
							try {
								this.emit("end"), this.cleanUp(), this.isFinished = !0;
							} catch (e) {
								this.emit("error", e);
							}
							return !0;
						},
						error: function(e) {
							return !this.isFinished && (this.isPaused ? this.generatedError = e : (this.isFinished = !0, this.emit("error", e), this.previous && this.previous.error(e), this.cleanUp()), !0);
						},
						on: function(e, t) {
							return this._listeners[e].push(t), this;
						},
						cleanUp: function() {
							this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
						},
						emit: function(e, t) {
							if (this._listeners[e]) for (var n = 0; n < this._listeners[e].length; n++) this._listeners[e][n].call(this, t);
						},
						pipe: function(e) {
							return e.registerPrevious(this);
						},
						registerPrevious: function(e) {
							if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
							this.streamInfo = e.streamInfo, this.mergeStreamInfo(), this.previous = e;
							var t = this;
							return e.on("data", function(e) {
								t.processChunk(e);
							}), e.on("end", function() {
								t.end();
							}), e.on("error", function(e) {
								t.error(e);
							}), this;
						},
						pause: function() {
							return !this.isPaused && !this.isFinished && (this.isPaused = !0, this.previous && this.previous.pause(), !0);
						},
						resume: function() {
							if (!this.isPaused || this.isFinished) return !1;
							var e = this.isPaused = !1;
							return this.generatedError && (this.error(this.generatedError), e = !0), this.previous && this.previous.resume(), !e;
						},
						flush: function() {},
						processChunk: function(e) {
							this.push(e);
						},
						withStreamInfo: function(e, t) {
							return this.extraStreamInfo[e] = t, this.mergeStreamInfo(), this;
						},
						mergeStreamInfo: function() {
							for (var e in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e) && (this.streamInfo[e] = this.extraStreamInfo[e]);
						},
						lock: function() {
							if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
							this.isLocked = !0, this.previous && this.previous.lock();
						},
						toString: function() {
							var e = "Worker " + this.name;
							return this.previous ? this.previous + " -> " + e : e;
						}
					}, t.exports = r;
				}, {}],
				29: [function(e, t, n) {
					"use strict";
					var r = e("../utils"), o = e("./ConvertWorker"), i = e("./GenericWorker"), a = e("../base64"), s = e("../support"), l = e("../external"), c = null;
					if (s.nodestream) try {
						c = e("../nodejs/NodejsStreamOutputAdapter");
					} catch (e) {}
					function u(e, t, n) {
						var a = t;
						switch (t) {
							case "blob":
							case "arraybuffer":
								a = "uint8array";
								break;
							case "base64": a = "string";
						}
						try {
							this._internalType = a, this._outputType = t, this._mimeType = n, r.checkSupport(a), this._worker = e.pipe(new o(a)), e.lock();
						} catch (e) {
							this._worker = new i("error"), this._worker.error(e);
						}
					}
					u.prototype = {
						accumulate: function(e) {
							return function(e, t) {
								return new l.Promise(function(n, o) {
									var i = [], s = e._internalType, l = e._outputType, c = e._mimeType;
									e.on("data", function(e, n) {
										i.push(e), t && t(n);
									}).on("error", function(e) {
										i = [], o(e);
									}).on("end", function() {
										try {
											n(function(e, t, n) {
												switch (e) {
													case "blob": return r.newBlob(r.transformTo("arraybuffer", t), n);
													case "base64": return a.encode(t);
													default: return r.transformTo(e, t);
												}
											}(l, function(e, t) {
												var n, r = 0, o = null, i = 0;
												for (n = 0; n < t.length; n++) i += t[n].length;
												switch (e) {
													case "string": return t.join("");
													case "array": return Array.prototype.concat.apply([], t);
													case "uint8array":
														for (o = new Uint8Array(i), n = 0; n < t.length; n++) o.set(t[n], r), r += t[n].length;
														return o;
													case "nodebuffer": return Buffer.concat(t);
													default: throw new Error("concat : unsupported type '" + e + "'");
												}
											}(s, i), c));
										} catch (e) {
											o(e);
										}
										i = [];
									}).resume();
								});
							}(this, e);
						},
						on: function(e, t) {
							var n = this;
							return "data" === e ? this._worker.on(e, function(e) {
								t.call(n, e.data, e.meta);
							}) : this._worker.on(e, function() {
								r.delay(t, arguments, n);
							}), this;
						},
						resume: function() {
							return r.delay(this._worker.resume, [], this._worker), this;
						},
						pause: function() {
							return this._worker.pause(), this;
						},
						toNodejsStream: function(e) {
							if (r.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
							return new c(this, { objectMode: "nodebuffer" !== this._outputType }, e);
						}
					}, t.exports = u;
				}, {
					"../base64": 1,
					"../external": 6,
					"../nodejs/NodejsStreamOutputAdapter": 13,
					"../support": 30,
					"../utils": 32,
					"./ConvertWorker": 24,
					"./GenericWorker": 28
				}],
				30: [function(e, t, n) {
					"use strict";
					if (n.base64 = !0, n.array = !0, n.string = !0, n.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, n.nodebuffer = "undefined" != typeof Buffer, n.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) n.blob = !1;
					else {
						var r = /* @__PURE__ */ new ArrayBuffer(0);
						try {
							n.blob = 0 === new Blob([r], { type: "application/zip" }).size;
						} catch (e) {
							try {
								var o = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
								o.append(r), n.blob = 0 === o.getBlob("application/zip").size;
							} catch (e) {
								n.blob = !1;
							}
						}
					}
					try {
						n.nodestream = !!e("readable-stream").Readable;
					} catch (e) {
						n.nodestream = !1;
					}
				}, { "readable-stream": 16 }],
				31: [function(e, t, n) {
					"use strict";
					for (var r = e("./utils"), o = e("./support"), i = e("./nodejsUtils"), a = e("./stream/GenericWorker"), s = new Array(256), l = 0; l < 256; l++) s[l] = 252 <= l ? 6 : 248 <= l ? 5 : 240 <= l ? 4 : 224 <= l ? 3 : 192 <= l ? 2 : 1;
					function c() {
						a.call(this, "utf-8 decode"), this.leftOver = null;
					}
					function u() {
						a.call(this, "utf-8 encode");
					}
					s[254] = s[254] = 1, n.utf8encode = function(e) {
						return o.nodebuffer ? i.newBufferFrom(e, "utf-8") : function(e) {
							var t, n, r, i, a, s = e.length, l = 0;
							for (i = 0; i < s; i++) 55296 == (64512 & (n = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (r = e.charCodeAt(i + 1))) && (n = 65536 + (n - 55296 << 10) + (r - 56320), i++), l += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
							for (t = o.uint8array ? new Uint8Array(l) : new Array(l), i = a = 0; a < l; i++) 55296 == (64512 & (n = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (r = e.charCodeAt(i + 1))) && (n = 65536 + (n - 55296 << 10) + (r - 56320), i++), n < 128 ? t[a++] = n : (n < 2048 ? t[a++] = 192 | n >>> 6 : (n < 65536 ? t[a++] = 224 | n >>> 12 : (t[a++] = 240 | n >>> 18, t[a++] = 128 | n >>> 12 & 63), t[a++] = 128 | n >>> 6 & 63), t[a++] = 128 | 63 & n);
							return t;
						}(e);
					}, n.utf8decode = function(e) {
						return o.nodebuffer ? r.transformTo("nodebuffer", e).toString("utf-8") : function(e) {
							var t, n, o, i, a = e.length, l = new Array(2 * a);
							for (t = n = 0; t < a;) if ((o = e[t++]) < 128) l[n++] = o;
							else if (4 < (i = s[o])) l[n++] = 65533, t += i - 1;
							else {
								for (o &= 2 === i ? 31 : 3 === i ? 15 : 7; 1 < i && t < a;) o = o << 6 | 63 & e[t++], i--;
								1 < i ? l[n++] = 65533 : o < 65536 ? l[n++] = o : (o -= 65536, l[n++] = 55296 | o >> 10 & 1023, l[n++] = 56320 | 1023 & o);
							}
							return l.length !== n && (l.subarray ? l = l.subarray(0, n) : l.length = n), r.applyFromCharCode(l);
						}(e = r.transformTo(o.uint8array ? "uint8array" : "array", e));
					}, r.inherits(c, a), c.prototype.processChunk = function(e) {
						var t = r.transformTo(o.uint8array ? "uint8array" : "array", e.data);
						if (this.leftOver && this.leftOver.length) {
							if (o.uint8array) {
								var i = t;
								(t = new Uint8Array(i.length + this.leftOver.length)).set(this.leftOver, 0), t.set(i, this.leftOver.length);
							} else t = this.leftOver.concat(t);
							this.leftOver = null;
						}
						var a = function(e, t) {
							var n;
							for ((t = t || e.length) > e.length && (t = e.length), n = t - 1; 0 <= n && 128 == (192 & e[n]);) n--;
							return n < 0 || 0 === n ? t : n + s[e[n]] > t ? n : t;
						}(t), l = t;
						a !== t.length && (o.uint8array ? (l = t.subarray(0, a), this.leftOver = t.subarray(a, t.length)) : (l = t.slice(0, a), this.leftOver = t.slice(a, t.length))), this.push({
							data: n.utf8decode(l),
							meta: e.meta
						});
					}, c.prototype.flush = function() {
						this.leftOver && this.leftOver.length && (this.push({
							data: n.utf8decode(this.leftOver),
							meta: {}
						}), this.leftOver = null);
					}, n.Utf8DecodeWorker = c, r.inherits(u, a), u.prototype.processChunk = function(e) {
						this.push({
							data: n.utf8encode(e.data),
							meta: e.meta
						});
					}, n.Utf8EncodeWorker = u;
				}, {
					"./nodejsUtils": 14,
					"./stream/GenericWorker": 28,
					"./support": 30,
					"./utils": 32
				}],
				32: [function(e, t, n) {
					"use strict";
					var r = e("./support"), o = e("./base64"), i = e("./nodejsUtils"), a = e("./external");
					function s(e) {
						return e;
					}
					function l(e, t) {
						for (var n = 0; n < e.length; ++n) t[n] = 255 & e.charCodeAt(n);
						return t;
					}
					e("setimmediate"), n.newBlob = function(t, r) {
						n.checkSupport("blob");
						try {
							return new Blob([t], { type: r });
						} catch (e) {
							try {
								var o = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
								return o.append(t), o.getBlob(r);
							} catch (e) {
								throw new Error("Bug : can't construct the Blob.");
							}
						}
					};
					var c = {
						stringifyByChunk: function(e, t, n) {
							var r = [], o = 0, i = e.length;
							if (i <= n) return String.fromCharCode.apply(null, e);
							for (; o < i;) "array" === t || "nodebuffer" === t ? r.push(String.fromCharCode.apply(null, e.slice(o, Math.min(o + n, i)))) : r.push(String.fromCharCode.apply(null, e.subarray(o, Math.min(o + n, i)))), o += n;
							return r.join("");
						},
						stringifyByChar: function(e) {
							for (var t = "", n = 0; n < e.length; n++) t += String.fromCharCode(e[n]);
							return t;
						},
						applyCanBeUsed: {
							uint8array: function() {
								try {
									return r.uint8array && 1 === String.fromCharCode.apply(null, /* @__PURE__ */ new Uint8Array(1)).length;
								} catch (e) {
									return !1;
								}
							}(),
							nodebuffer: function() {
								try {
									return r.nodebuffer && 1 === String.fromCharCode.apply(null, i.allocBuffer(1)).length;
								} catch (e) {
									return !1;
								}
							}()
						}
					};
					function u(e) {
						var t = 65536, r = n.getTypeOf(e), o = !0;
						if ("uint8array" === r ? o = c.applyCanBeUsed.uint8array : "nodebuffer" === r && (o = c.applyCanBeUsed.nodebuffer), o) for (; 1 < t;) try {
							return c.stringifyByChunk(e, r, t);
						} catch (e) {
							t = Math.floor(t / 2);
						}
						return c.stringifyByChar(e);
					}
					function d(e, t) {
						for (var n = 0; n < e.length; n++) t[n] = e[n];
						return t;
					}
					n.applyFromCharCode = u;
					var p = {};
					p.string = {
						string: s,
						array: function(e) {
							return l(e, new Array(e.length));
						},
						arraybuffer: function(e) {
							return p.string.uint8array(e).buffer;
						},
						uint8array: function(e) {
							return l(e, new Uint8Array(e.length));
						},
						nodebuffer: function(e) {
							return l(e, i.allocBuffer(e.length));
						}
					}, p.array = {
						string: u,
						array: s,
						arraybuffer: function(e) {
							return new Uint8Array(e).buffer;
						},
						uint8array: function(e) {
							return new Uint8Array(e);
						},
						nodebuffer: function(e) {
							return i.newBufferFrom(e);
						}
					}, p.arraybuffer = {
						string: function(e) {
							return u(new Uint8Array(e));
						},
						array: function(e) {
							return d(new Uint8Array(e), new Array(e.byteLength));
						},
						arraybuffer: s,
						uint8array: function(e) {
							return new Uint8Array(e);
						},
						nodebuffer: function(e) {
							return i.newBufferFrom(new Uint8Array(e));
						}
					}, p.uint8array = {
						string: u,
						array: function(e) {
							return d(e, new Array(e.length));
						},
						arraybuffer: function(e) {
							return e.buffer;
						},
						uint8array: s,
						nodebuffer: function(e) {
							return i.newBufferFrom(e);
						}
					}, p.nodebuffer = {
						string: u,
						array: function(e) {
							return d(e, new Array(e.length));
						},
						arraybuffer: function(e) {
							return p.nodebuffer.uint8array(e).buffer;
						},
						uint8array: function(e) {
							return d(e, new Uint8Array(e.length));
						},
						nodebuffer: s
					}, n.transformTo = function(e, t) {
						return t = t || "", e ? (n.checkSupport(e), p[n.getTypeOf(t)][e](t)) : t;
					}, n.resolve = function(e) {
						for (var t = e.split("/"), n = [], r = 0; r < t.length; r++) {
							var o = t[r];
							"." === o || "" === o && 0 !== r && r !== t.length - 1 || (".." === o ? n.pop() : n.push(o));
						}
						return n.join("/");
					}, n.getTypeOf = function(e) {
						if ("string" == typeof e) return "string";
						var t = Object.prototype.toString.call(e);
						return "[object Array]" === t ? "array" : r.nodebuffer && i.isBuffer(e) ? "nodebuffer" : r.uint8array && "[object Uint8Array]" === t ? "uint8array" : r.arraybuffer && "[object ArrayBuffer]" === t ? "arraybuffer" : void 0;
					}, n.checkSupport = function(e) {
						if (!r[e.toLowerCase()]) throw new Error(e + " is not supported by this platform");
					}, n.MAX_VALUE_16BITS = 65535, n.MAX_VALUE_32BITS = -1, n.pretty = function(e) {
						var t, n, r = "";
						for (n = 0; n < (e || "").length; n++) r += "\\x" + ((t = e.charCodeAt(n)) < 16 ? "0" : "") + t.toString(16).toUpperCase();
						return r;
					}, n.delay = function(e, t, n) {
						setImmediate(function() {
							e.apply(n || null, t || []);
						});
					}, n.inherits = function(e, t) {
						function n() {}
						n.prototype = t.prototype, e.prototype = new n();
					}, n.extend = function() {
						var e, t, n = {};
						for (e = 0; e < arguments.length; e++) for (t in arguments[e]) Object.prototype.hasOwnProperty.call(arguments[e], t) && void 0 === n[t] && (n[t] = arguments[e][t]);
						return n;
					}, n.prepareContent = function(e, t, i, s, c) {
						return a.Promise.resolve(t).then(function(t) {
							return r.blob && (t instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(t))) ? void 0 !== Blob.prototype.arrayBuffer ? t.arrayBuffer() : "undefined" != typeof FileReader ? new a.Promise(function(e, n) {
								var r = new FileReader();
								r.onload = function(t) {
									e(t.target.result);
								}, r.onerror = function(e) {
									n(e.target.error);
								}, r.readAsArrayBuffer(t);
							}) : a.Promise.reject(/* @__PURE__ */ new Error(e + " is a Blob, but we have no way of reading it.")) : t;
						}).then(function(t) {
							var u = n.getTypeOf(t);
							return u ? ("arraybuffer" === u ? t = n.transformTo("uint8array", t) : "string" === u && (c ? t = o.decode(t) : i && !0 !== s && (t = function(e) {
								return l(e, r.uint8array ? new Uint8Array(e.length) : new Array(e.length));
							}(t))), t) : a.Promise.reject(/* @__PURE__ */ new Error("Can't read the data of '" + e + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
						});
					};
				}, {
					"./base64": 1,
					"./external": 6,
					"./nodejsUtils": 14,
					"./support": 30,
					setimmediate: 54
				}],
				33: [function(e, t, n) {
					"use strict";
					var r = e("./reader/readerFor"), o = e("./utils"), i = e("./signature"), a = e("./zipEntry"), s = e("./support");
					function l(e) {
						this.files = [], this.loadOptions = e;
					}
					l.prototype = {
						checkSignature: function(e) {
							if (!this.reader.readAndCheckSignature(e)) {
								this.reader.index -= 4;
								var t = this.reader.readString(4);
								throw new Error("Corrupted zip or bug: unexpected signature (" + o.pretty(t) + ", expected " + o.pretty(e) + ")");
							}
						},
						isSignature: function(e, t) {
							var n = this.reader.index;
							this.reader.setIndex(e);
							var r = this.reader.readString(4) === t;
							return this.reader.setIndex(n), r;
						},
						readBlockEndOfCentral: function() {
							this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
							var e = this.reader.readData(this.zipCommentLength), t = s.uint8array ? "uint8array" : "array", n = o.transformTo(t, e);
							this.zipComment = this.loadOptions.decodeFileName(n);
						},
						readBlockZip64EndOfCentral: function() {
							this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
							for (var e, t, n, r = this.zip64EndOfCentralSize - 44; 0 < r;) e = this.reader.readInt(2), t = this.reader.readInt(4), n = this.reader.readData(t), this.zip64ExtensibleData[e] = {
								id: e,
								length: t,
								value: n
							};
						},
						readBlockZip64EndOfCentralLocator: function() {
							if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
						},
						readLocalFiles: function() {
							for (var e, t = 0; t < this.files.length; t++) e = this.files[t], this.reader.setIndex(e.localHeaderOffset), this.checkSignature(i.LOCAL_FILE_HEADER), e.readLocalPart(this.reader), e.handleUTF8(), e.processAttributes();
						},
						readCentralDir: function() {
							var e;
							for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(i.CENTRAL_FILE_HEADER);) (e = new a({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e);
							if (this.centralDirRecords !== this.files.length && 0 !== this.centralDirRecords && 0 === this.files.length) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
						},
						readEndOfCentral: function() {
							var e = this.reader.lastIndexOfSignature(i.CENTRAL_DIRECTORY_END);
							if (e < 0) throw this.isSignature(0, i.LOCAL_FILE_HEADER) ? /* @__PURE__ */ new Error("Corrupted zip: can't find end of central directory") : /* @__PURE__ */ new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
							this.reader.setIndex(e);
							var t = e;
							if (this.checkSignature(i.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === o.MAX_VALUE_16BITS || this.diskWithCentralDirStart === o.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === o.MAX_VALUE_16BITS || this.centralDirRecords === o.MAX_VALUE_16BITS || this.centralDirSize === o.MAX_VALUE_32BITS || this.centralDirOffset === o.MAX_VALUE_32BITS) {
								if (this.zip64 = !0, (e = this.reader.lastIndexOfSignature(i.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
								if (this.reader.setIndex(e), this.checkSignature(i.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, i.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(i.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
								this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(i.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
							}
							var n = this.centralDirOffset + this.centralDirSize;
							this.zip64 && (n += 20, n += 12 + this.zip64EndOfCentralSize);
							var r = t - n;
							if (0 < r) this.isSignature(t, i.CENTRAL_FILE_HEADER) || (this.reader.zero = r);
							else if (r < 0) throw new Error("Corrupted zip: missing " + Math.abs(r) + " bytes.");
						},
						prepareReader: function(e) {
							this.reader = r(e);
						},
						load: function(e) {
							this.prepareReader(e), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
						}
					}, t.exports = l;
				}, {
					"./reader/readerFor": 22,
					"./signature": 23,
					"./support": 30,
					"./utils": 32,
					"./zipEntry": 34
				}],
				34: [function(e, t, n) {
					"use strict";
					var r = e("./reader/readerFor"), o = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), s = e("./utf8"), l = e("./compressions"), c = e("./support");
					function u(e, t) {
						this.options = e, this.loadOptions = t;
					}
					u.prototype = {
						isEncrypted: function() {
							return !(1 & ~this.bitFlag);
						},
						useUTF8: function() {
							return !(2048 & ~this.bitFlag);
						},
						readLocalPart: function(e) {
							var t, n;
							if (e.skip(22), this.fileNameLength = e.readInt(2), n = e.readInt(2), this.fileName = e.readData(this.fileNameLength), e.skip(n), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
							if (null === (t = function(e) {
								for (var t in l) if (Object.prototype.hasOwnProperty.call(l, t) && l[t].magic === e) return l[t];
								return null;
							}(this.compressionMethod))) throw new Error("Corrupted zip : compression " + o.pretty(this.compressionMethod) + " unknown (inner file : " + o.transformTo("string", this.fileName) + ")");
							this.decompressed = new i(this.compressedSize, this.uncompressedSize, this.crc32, t, e.readData(this.compressedSize));
						},
						readCentralPart: function(e) {
							this.versionMadeBy = e.readInt(2), e.skip(2), this.bitFlag = e.readInt(2), this.compressionMethod = e.readString(2), this.date = e.readDate(), this.crc32 = e.readInt(4), this.compressedSize = e.readInt(4), this.uncompressedSize = e.readInt(4);
							var t = e.readInt(2);
							if (this.extraFieldsLength = e.readInt(2), this.fileCommentLength = e.readInt(2), this.diskNumberStart = e.readInt(2), this.internalFileAttributes = e.readInt(2), this.externalFileAttributes = e.readInt(4), this.localHeaderOffset = e.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
							e.skip(t), this.readExtraFields(e), this.parseZIP64ExtraField(e), this.fileComment = e.readData(this.fileCommentLength);
						},
						processAttributes: function() {
							this.unixPermissions = null, this.dosPermissions = null;
							var e = this.versionMadeBy >> 8;
							this.dir = !!(16 & this.externalFileAttributes), 0 == e && (this.dosPermissions = 63 & this.externalFileAttributes), 3 == e && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || "/" !== this.fileNameStr.slice(-1) || (this.dir = !0);
						},
						parseZIP64ExtraField: function() {
							if (this.extraFields[1]) {
								var e = r(this.extraFields[1].value);
								this.uncompressedSize === o.MAX_VALUE_32BITS && (this.uncompressedSize = e.readInt(8)), this.compressedSize === o.MAX_VALUE_32BITS && (this.compressedSize = e.readInt(8)), this.localHeaderOffset === o.MAX_VALUE_32BITS && (this.localHeaderOffset = e.readInt(8)), this.diskNumberStart === o.MAX_VALUE_32BITS && (this.diskNumberStart = e.readInt(4));
							}
						},
						readExtraFields: function(e) {
							var t, n, r, o = e.index + this.extraFieldsLength;
							for (this.extraFields || (this.extraFields = {}); e.index + 4 < o;) t = e.readInt(2), n = e.readInt(2), r = e.readData(n), this.extraFields[t] = {
								id: t,
								length: n,
								value: r
							};
							e.setIndex(o);
						},
						handleUTF8: function() {
							var e = c.uint8array ? "uint8array" : "array";
							if (this.useUTF8()) this.fileNameStr = s.utf8decode(this.fileName), this.fileCommentStr = s.utf8decode(this.fileComment);
							else {
								var t = this.findExtraFieldUnicodePath();
								if (null !== t) this.fileNameStr = t;
								else {
									var n = o.transformTo(e, this.fileName);
									this.fileNameStr = this.loadOptions.decodeFileName(n);
								}
								var r = this.findExtraFieldUnicodeComment();
								if (null !== r) this.fileCommentStr = r;
								else {
									var i = o.transformTo(e, this.fileComment);
									this.fileCommentStr = this.loadOptions.decodeFileName(i);
								}
							}
						},
						findExtraFieldUnicodePath: function() {
							var e = this.extraFields[28789];
							if (e) {
								var t = r(e.value);
								return 1 !== t.readInt(1) || a(this.fileName) !== t.readInt(4) ? null : s.utf8decode(t.readData(e.length - 5));
							}
							return null;
						},
						findExtraFieldUnicodeComment: function() {
							var e = this.extraFields[25461];
							if (e) {
								var t = r(e.value);
								return 1 !== t.readInt(1) || a(this.fileComment) !== t.readInt(4) ? null : s.utf8decode(t.readData(e.length - 5));
							}
							return null;
						}
					}, t.exports = u;
				}, {
					"./compressedObject": 2,
					"./compressions": 3,
					"./crc32": 4,
					"./reader/readerFor": 22,
					"./support": 30,
					"./utf8": 31,
					"./utils": 32
				}],
				35: [function(e, t, n) {
					"use strict";
					function r(e, t, n) {
						this.name = e, this.dir = n.dir, this.date = n.date, this.comment = n.comment, this.unixPermissions = n.unixPermissions, this.dosPermissions = n.dosPermissions, this._data = t, this._dataBinary = n.binary, this.options = {
							compression: n.compression,
							compressionOptions: n.compressionOptions
						};
					}
					var o = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), s = e("./compressedObject"), l = e("./stream/GenericWorker");
					r.prototype = {
						internalStream: function(e) {
							var t = null, n = "string";
							try {
								if (!e) throw new Error("No output type specified.");
								var r = "string" === (n = e.toLowerCase()) || "text" === n;
								"binarystring" !== n && "text" !== n || (n = "string"), t = this._decompressWorker();
								var i = !this._dataBinary;
								i && !r && (t = t.pipe(new a.Utf8EncodeWorker())), !i && r && (t = t.pipe(new a.Utf8DecodeWorker()));
							} catch (e) {
								(t = new l("error")).error(e);
							}
							return new o(t, n, "");
						},
						async: function(e, t) {
							return this.internalStream(e).accumulate(t);
						},
						nodeStream: function(e, t) {
							return this.internalStream(e || "nodebuffer").toNodejsStream(t);
						},
						_compressWorker: function(e, t) {
							if (this._data instanceof s && this._data.compression.magic === e.magic) return this._data.getCompressedWorker();
							var n = this._decompressWorker();
							return this._dataBinary || (n = n.pipe(new a.Utf8EncodeWorker())), s.createWorkerFrom(n, e, t);
						},
						_decompressWorker: function() {
							return this._data instanceof s ? this._data.getContentWorker() : this._data instanceof l ? this._data : new i(this._data);
						}
					};
					for (var c = [
						"asText",
						"asBinary",
						"asNodeBuffer",
						"asUint8Array",
						"asArrayBuffer"
					], u = function() {
						throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
					}, d = 0; d < c.length; d++) r.prototype[c[d]] = u;
					t.exports = r;
				}, {
					"./compressedObject": 2,
					"./stream/DataWorker": 27,
					"./stream/GenericWorker": 28,
					"./stream/StreamHelper": 29,
					"./utf8": 31
				}],
				36: [function(e, t, n) {
					(function(e) {
						"use strict";
						var n, r, o = e.MutationObserver || e.WebKitMutationObserver;
						if (o) {
							var i = 0, a = new o(u), s = e.document.createTextNode("");
							a.observe(s, { characterData: !0 }), n = function() {
								s.data = i = ++i % 2;
							};
						} else if (e.setImmediate || void 0 === e.MessageChannel) n = "document" in e && "onreadystatechange" in e.document.createElement("script") ? function() {
							var t = e.document.createElement("script");
							t.onreadystatechange = function() {
								u(), t.onreadystatechange = null, t.parentNode.removeChild(t), t = null;
							}, e.document.documentElement.appendChild(t);
						} : function() {
							setTimeout(u, 0);
						};
						else {
							var l = new e.MessageChannel();
							l.port1.onmessage = u, n = function() {
								l.port2.postMessage(0);
							};
						}
						var c = [];
						function u() {
							var e, t;
							r = !0;
							for (var n = c.length; n;) {
								for (t = c, c = [], e = -1; ++e < n;) t[e]();
								n = c.length;
							}
							r = !1;
						}
						t.exports = function(e) {
							1 !== c.push(e) || r || n();
						};
					}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
				}, {}],
				37: [function(e, t, n) {
					"use strict";
					var r = e("immediate");
					function o() {}
					var i = {}, a = ["REJECTED"], s = ["FULFILLED"], l = ["PENDING"];
					function c(e) {
						if ("function" != typeof e) throw new TypeError("resolver must be a function");
						this.state = l, this.queue = [], this.outcome = void 0, e !== o && f(this, e);
					}
					function u(e, t, n) {
						this.promise = e, "function" == typeof t && (this.onFulfilled = t, this.callFulfilled = this.otherCallFulfilled), "function" == typeof n && (this.onRejected = n, this.callRejected = this.otherCallRejected);
					}
					function d(e, t, n) {
						r(function() {
							var r;
							try {
								r = t(n);
							} catch (r) {
								return i.reject(e, r);
							}
							r === e ? i.reject(e, /* @__PURE__ */ new TypeError("Cannot resolve promise with itself")) : i.resolve(e, r);
						});
					}
					function p(e) {
						var t = e && e.then;
						if (e && ("object" == typeof e || "function" == typeof e) && "function" == typeof t) return function() {
							t.apply(e, arguments);
						};
					}
					function f(e, t) {
						var n = !1;
						function r(t) {
							n || (n = !0, i.reject(e, t));
						}
						function o(t) {
							n || (n = !0, i.resolve(e, t));
						}
						var a = h(function() {
							t(o, r);
						});
						"error" === a.status && r(a.value);
					}
					function h(e, t) {
						var n = {};
						try {
							n.value = e(t), n.status = "success";
						} catch (e) {
							n.status = "error", n.value = e;
						}
						return n;
					}
					(t.exports = c).prototype.finally = function(e) {
						if ("function" != typeof e) return this;
						var t = this.constructor;
						return this.then(function(n) {
							return t.resolve(e()).then(function() {
								return n;
							});
						}, function(n) {
							return t.resolve(e()).then(function() {
								throw n;
							});
						});
					}, c.prototype.catch = function(e) {
						return this.then(null, e);
					}, c.prototype.then = function(e, t) {
						if ("function" != typeof e && this.state === s || "function" != typeof t && this.state === a) return this;
						var n = new this.constructor(o);
						return this.state !== l ? d(n, this.state === s ? e : t, this.outcome) : this.queue.push(new u(n, e, t)), n;
					}, u.prototype.callFulfilled = function(e) {
						i.resolve(this.promise, e);
					}, u.prototype.otherCallFulfilled = function(e) {
						d(this.promise, this.onFulfilled, e);
					}, u.prototype.callRejected = function(e) {
						i.reject(this.promise, e);
					}, u.prototype.otherCallRejected = function(e) {
						d(this.promise, this.onRejected, e);
					}, i.resolve = function(e, t) {
						var n = h(p, t);
						if ("error" === n.status) return i.reject(e, n.value);
						var r = n.value;
						if (r) f(e, r);
						else {
							e.state = s, e.outcome = t;
							for (var o = -1, a = e.queue.length; ++o < a;) e.queue[o].callFulfilled(t);
						}
						return e;
					}, i.reject = function(e, t) {
						e.state = a, e.outcome = t;
						for (var n = -1, r = e.queue.length; ++n < r;) e.queue[n].callRejected(t);
						return e;
					}, c.resolve = function(e) {
						return e instanceof this ? e : i.resolve(new this(o), e);
					}, c.reject = function(e) {
						var t = new this(o);
						return i.reject(t, e);
					}, c.all = function(e) {
						var t = this;
						if ("[object Array]" !== Object.prototype.toString.call(e)) return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
						var n = e.length, r = !1;
						if (!n) return this.resolve([]);
						for (var a = new Array(n), s = 0, l = -1, c = new this(o); ++l < n;) u(e[l], l);
						return c;
						function u(e, o) {
							t.resolve(e).then(function(e) {
								a[o] = e, ++s !== n || r || (r = !0, i.resolve(c, a));
							}, function(e) {
								r || (r = !0, i.reject(c, e));
							});
						}
					}, c.race = function(e) {
						if ("[object Array]" !== Object.prototype.toString.call(e)) return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
						var t = e.length, n = !1;
						if (!t) return this.resolve([]);
						for (var r, a = -1, s = new this(o); ++a < t;) r = e[a], this.resolve(r).then(function(e) {
							n || (n = !0, i.resolve(s, e));
						}, function(e) {
							n || (n = !0, i.reject(s, e));
						});
						return s;
					};
				}, { immediate: 36 }],
				38: [function(e, t, n) {
					"use strict";
					var r = {};
					(0, e("./lib/utils/common").assign)(r, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = r;
				}, {
					"./lib/deflate": 39,
					"./lib/inflate": 40,
					"./lib/utils/common": 41,
					"./lib/zlib/constants": 44
				}],
				39: [function(e, t, n) {
					"use strict";
					var r = e("./zlib/deflate"), o = e("./utils/common"), i = e("./utils/strings"), a = e("./zlib/messages"), s = e("./zlib/zstream"), l = Object.prototype.toString;
					function c(e) {
						if (!(this instanceof c)) return new c(e);
						this.options = o.assign({
							level: -1,
							method: 8,
							chunkSize: 16384,
							windowBits: 15,
							memLevel: 8,
							strategy: 0,
							to: ""
						}, e || {});
						var t = this.options;
						t.raw && 0 < t.windowBits ? t.windowBits = -t.windowBits : t.gzip && 0 < t.windowBits && t.windowBits < 16 && (t.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
						var n = r.deflateInit2(this.strm, t.level, t.method, t.windowBits, t.memLevel, t.strategy);
						if (0 !== n) throw new Error(a[n]);
						if (t.header && r.deflateSetHeader(this.strm, t.header), t.dictionary) {
							var u = "string" == typeof t.dictionary ? i.string2buf(t.dictionary) : "[object ArrayBuffer]" === l.call(t.dictionary) ? new Uint8Array(t.dictionary) : t.dictionary;
							if (0 !== (n = r.deflateSetDictionary(this.strm, u))) throw new Error(a[n]);
							this._dict_set = !0;
						}
					}
					function u(e, t) {
						var n = new c(t);
						if (n.push(e, !0), n.err) throw n.msg || a[n.err];
						return n.result;
					}
					c.prototype.push = function(e, t) {
						var n, a, s = this.strm, c = this.options.chunkSize;
						if (this.ended) return !1;
						a = t === ~~t ? t : !0 === t ? 4 : 0, "string" == typeof e ? s.input = i.string2buf(e) : "[object ArrayBuffer]" === l.call(e) ? s.input = new Uint8Array(e) : s.input = e, s.next_in = 0, s.avail_in = s.input.length;
						do {
							if (0 === s.avail_out && (s.output = new o.Buf8(c), s.next_out = 0, s.avail_out = c), 1 !== (n = r.deflate(s, a)) && 0 !== n) return this.onEnd(n), !(this.ended = !0);
							0 !== s.avail_out && (0 !== s.avail_in || 4 !== a && 2 !== a) || ("string" === this.options.to ? this.onData(i.buf2binstring(o.shrinkBuf(s.output, s.next_out))) : this.onData(o.shrinkBuf(s.output, s.next_out)));
						} while ((0 < s.avail_in || 0 === s.avail_out) && 1 !== n);
						return 4 === a ? (n = r.deflateEnd(this.strm), this.onEnd(n), this.ended = !0, 0 === n) : 2 !== a || (this.onEnd(0), !(s.avail_out = 0));
					}, c.prototype.onData = function(e) {
						this.chunks.push(e);
					}, c.prototype.onEnd = function(e) {
						0 === e && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
					}, n.Deflate = c, n.deflate = u, n.deflateRaw = function(e, t) {
						return (t = t || {}).raw = !0, u(e, t);
					}, n.gzip = function(e, t) {
						return (t = t || {}).gzip = !0, u(e, t);
					};
				}, {
					"./utils/common": 41,
					"./utils/strings": 42,
					"./zlib/deflate": 46,
					"./zlib/messages": 51,
					"./zlib/zstream": 53
				}],
				40: [function(e, t, n) {
					"use strict";
					var r = e("./zlib/inflate"), o = e("./utils/common"), i = e("./utils/strings"), a = e("./zlib/constants"), s = e("./zlib/messages"), l = e("./zlib/zstream"), c = e("./zlib/gzheader"), u = Object.prototype.toString;
					function d(e) {
						if (!(this instanceof d)) return new d(e);
						this.options = o.assign({
							chunkSize: 16384,
							windowBits: 0,
							to: ""
						}, e || {});
						var t = this.options;
						t.raw && 0 <= t.windowBits && t.windowBits < 16 && (t.windowBits = -t.windowBits, 0 === t.windowBits && (t.windowBits = -15)), !(0 <= t.windowBits && t.windowBits < 16) || e && e.windowBits || (t.windowBits += 32), 15 < t.windowBits && t.windowBits < 48 && !(15 & t.windowBits) && (t.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l(), this.strm.avail_out = 0;
						var n = r.inflateInit2(this.strm, t.windowBits);
						if (n !== a.Z_OK) throw new Error(s[n]);
						this.header = new c(), r.inflateGetHeader(this.strm, this.header);
					}
					function p(e, t) {
						var n = new d(t);
						if (n.push(e, !0), n.err) throw n.msg || s[n.err];
						return n.result;
					}
					d.prototype.push = function(e, t) {
						var n, s, l, c, d, p, f = this.strm, h = this.options.chunkSize, m = this.options.dictionary, g = !1;
						if (this.ended) return !1;
						s = t === ~~t ? t : !0 === t ? a.Z_FINISH : a.Z_NO_FLUSH, "string" == typeof e ? f.input = i.binstring2buf(e) : "[object ArrayBuffer]" === u.call(e) ? f.input = new Uint8Array(e) : f.input = e, f.next_in = 0, f.avail_in = f.input.length;
						do {
							if (0 === f.avail_out && (f.output = new o.Buf8(h), f.next_out = 0, f.avail_out = h), (n = r.inflate(f, a.Z_NO_FLUSH)) === a.Z_NEED_DICT && m && (p = "string" == typeof m ? i.string2buf(m) : "[object ArrayBuffer]" === u.call(m) ? new Uint8Array(m) : m, n = r.inflateSetDictionary(this.strm, p)), n === a.Z_BUF_ERROR && !0 === g && (n = a.Z_OK, g = !1), n !== a.Z_STREAM_END && n !== a.Z_OK) return this.onEnd(n), !(this.ended = !0);
							f.next_out && (0 !== f.avail_out && n !== a.Z_STREAM_END && (0 !== f.avail_in || s !== a.Z_FINISH && s !== a.Z_SYNC_FLUSH) || ("string" === this.options.to ? (l = i.utf8border(f.output, f.next_out), c = f.next_out - l, d = i.buf2string(f.output, l), f.next_out = c, f.avail_out = h - c, c && o.arraySet(f.output, f.output, l, c, 0), this.onData(d)) : this.onData(o.shrinkBuf(f.output, f.next_out)))), 0 === f.avail_in && 0 === f.avail_out && (g = !0);
						} while ((0 < f.avail_in || 0 === f.avail_out) && n !== a.Z_STREAM_END);
						return n === a.Z_STREAM_END && (s = a.Z_FINISH), s === a.Z_FINISH ? (n = r.inflateEnd(this.strm), this.onEnd(n), this.ended = !0, n === a.Z_OK) : s !== a.Z_SYNC_FLUSH || (this.onEnd(a.Z_OK), !(f.avail_out = 0));
					}, d.prototype.onData = function(e) {
						this.chunks.push(e);
					}, d.prototype.onEnd = function(e) {
						e === a.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
					}, n.Inflate = d, n.inflate = p, n.inflateRaw = function(e, t) {
						return (t = t || {}).raw = !0, p(e, t);
					}, n.ungzip = p;
				}, {
					"./utils/common": 41,
					"./utils/strings": 42,
					"./zlib/constants": 44,
					"./zlib/gzheader": 47,
					"./zlib/inflate": 49,
					"./zlib/messages": 51,
					"./zlib/zstream": 53
				}],
				41: [function(e, t, n) {
					"use strict";
					var r = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
					n.assign = function(e) {
						for (var t = Array.prototype.slice.call(arguments, 1); t.length;) {
							var n = t.shift();
							if (n) {
								if ("object" != typeof n) throw new TypeError(n + "must be non-object");
								for (var r in n) n.hasOwnProperty(r) && (e[r] = n[r]);
							}
						}
						return e;
					}, n.shrinkBuf = function(e, t) {
						return e.length === t ? e : e.subarray ? e.subarray(0, t) : (e.length = t, e);
					};
					var o = {
						arraySet: function(e, t, n, r, o) {
							if (t.subarray && e.subarray) e.set(t.subarray(n, n + r), o);
							else for (var i = 0; i < r; i++) e[o + i] = t[n + i];
						},
						flattenChunks: function(e) {
							for (var t, n, r, o, i = t = 0, a = e.length; i < a; i++) t += e[i].length;
							for (o = new Uint8Array(t), i = n = 0, a = e.length; i < a; i++) r = e[i], o.set(r, n), n += r.length;
							return o;
						}
					}, i = {
						arraySet: function(e, t, n, r, o) {
							for (var i = 0; i < r; i++) e[o + i] = t[n + i];
						},
						flattenChunks: function(e) {
							return [].concat.apply([], e);
						}
					};
					n.setTyped = function(e) {
						e ? (n.Buf8 = Uint8Array, n.Buf16 = Uint16Array, n.Buf32 = Int32Array, n.assign(n, o)) : (n.Buf8 = Array, n.Buf16 = Array, n.Buf32 = Array, n.assign(n, i));
					}, n.setTyped(r);
				}, {}],
				42: [function(e, t, n) {
					"use strict";
					var r = e("./common"), o = !0, i = !0;
					try {
						String.fromCharCode.apply(null, [0]);
					} catch (e) {
						o = !1;
					}
					try {
						String.fromCharCode.apply(null, /* @__PURE__ */ new Uint8Array(1));
					} catch (e) {
						i = !1;
					}
					for (var a = new r.Buf8(256), s = 0; s < 256; s++) a[s] = 252 <= s ? 6 : 248 <= s ? 5 : 240 <= s ? 4 : 224 <= s ? 3 : 192 <= s ? 2 : 1;
					function l(e, t) {
						if (t < 65537 && (e.subarray && i || !e.subarray && o)) return String.fromCharCode.apply(null, r.shrinkBuf(e, t));
						for (var n = "", a = 0; a < t; a++) n += String.fromCharCode(e[a]);
						return n;
					}
					a[254] = a[254] = 1, n.string2buf = function(e) {
						var t, n, o, i, a, s = e.length, l = 0;
						for (i = 0; i < s; i++) 55296 == (64512 & (n = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (o = e.charCodeAt(i + 1))) && (n = 65536 + (n - 55296 << 10) + (o - 56320), i++), l += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
						for (t = new r.Buf8(l), i = a = 0; a < l; i++) 55296 == (64512 & (n = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (o = e.charCodeAt(i + 1))) && (n = 65536 + (n - 55296 << 10) + (o - 56320), i++), n < 128 ? t[a++] = n : (n < 2048 ? t[a++] = 192 | n >>> 6 : (n < 65536 ? t[a++] = 224 | n >>> 12 : (t[a++] = 240 | n >>> 18, t[a++] = 128 | n >>> 12 & 63), t[a++] = 128 | n >>> 6 & 63), t[a++] = 128 | 63 & n);
						return t;
					}, n.buf2binstring = function(e) {
						return l(e, e.length);
					}, n.binstring2buf = function(e) {
						for (var t = new r.Buf8(e.length), n = 0, o = t.length; n < o; n++) t[n] = e.charCodeAt(n);
						return t;
					}, n.buf2string = function(e, t) {
						var n, r, o, i, s = t || e.length, c = new Array(2 * s);
						for (n = r = 0; n < s;) if ((o = e[n++]) < 128) c[r++] = o;
						else if (4 < (i = a[o])) c[r++] = 65533, n += i - 1;
						else {
							for (o &= 2 === i ? 31 : 3 === i ? 15 : 7; 1 < i && n < s;) o = o << 6 | 63 & e[n++], i--;
							1 < i ? c[r++] = 65533 : o < 65536 ? c[r++] = o : (o -= 65536, c[r++] = 55296 | o >> 10 & 1023, c[r++] = 56320 | 1023 & o);
						}
						return l(c, r);
					}, n.utf8border = function(e, t) {
						var n;
						for ((t = t || e.length) > e.length && (t = e.length), n = t - 1; 0 <= n && 128 == (192 & e[n]);) n--;
						return n < 0 || 0 === n ? t : n + a[e[n]] > t ? n : t;
					};
				}, { "./common": 41 }],
				43: [function(e, t, n) {
					"use strict";
					t.exports = function(e, t, n, r) {
						for (var o = 65535 & e, i = e >>> 16 & 65535, a = 0; 0 !== n;) {
							for (n -= a = 2e3 < n ? 2e3 : n; i = i + (o = o + t[r++] | 0) | 0, --a;);
							o %= 65521, i %= 65521;
						}
						return o | i << 16;
					};
				}, {}],
				44: [function(e, t, n) {
					"use strict";
					t.exports = {
						Z_NO_FLUSH: 0,
						Z_PARTIAL_FLUSH: 1,
						Z_SYNC_FLUSH: 2,
						Z_FULL_FLUSH: 3,
						Z_FINISH: 4,
						Z_BLOCK: 5,
						Z_TREES: 6,
						Z_OK: 0,
						Z_STREAM_END: 1,
						Z_NEED_DICT: 2,
						Z_ERRNO: -1,
						Z_STREAM_ERROR: -2,
						Z_DATA_ERROR: -3,
						Z_BUF_ERROR: -5,
						Z_NO_COMPRESSION: 0,
						Z_BEST_SPEED: 1,
						Z_BEST_COMPRESSION: 9,
						Z_DEFAULT_COMPRESSION: -1,
						Z_FILTERED: 1,
						Z_HUFFMAN_ONLY: 2,
						Z_RLE: 3,
						Z_FIXED: 4,
						Z_DEFAULT_STRATEGY: 0,
						Z_BINARY: 0,
						Z_TEXT: 1,
						Z_UNKNOWN: 2,
						Z_DEFLATED: 8
					};
				}, {}],
				45: [function(e, t, n) {
					"use strict";
					var r = function() {
						for (var e, t = [], n = 0; n < 256; n++) {
							e = n;
							for (var r = 0; r < 8; r++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
							t[n] = e;
						}
						return t;
					}();
					t.exports = function(e, t, n, o) {
						var i = r, a = o + n;
						e ^= -1;
						for (var s = o; s < a; s++) e = e >>> 8 ^ i[255 & (e ^ t[s])];
						return -1 ^ e;
					};
				}, {}],
				46: [function(e, t, n) {
					"use strict";
					var r, o = e("../utils/common"), i = e("./trees"), a = e("./adler32"), s = e("./crc32"), l = e("./messages"), c = -2, u = 258, d = 262, p = 113;
					function f(e, t) {
						return e.msg = l[t], t;
					}
					function h(e) {
						return (e << 1) - (4 < e ? 9 : 0);
					}
					function m(e) {
						for (var t = e.length; 0 <= --t;) e[t] = 0;
					}
					function g(e) {
						var t = e.state, n = t.pending;
						n > e.avail_out && (n = e.avail_out), 0 !== n && (o.arraySet(e.output, t.pending_buf, t.pending_out, n, e.next_out), e.next_out += n, t.pending_out += n, e.total_out += n, e.avail_out -= n, t.pending -= n, 0 === t.pending && (t.pending_out = 0));
					}
					function w(e, t) {
						i._tr_flush_block(e, 0 <= e.block_start ? e.block_start : -1, e.strstart - e.block_start, t), e.block_start = e.strstart, g(e.strm);
					}
					function b(e, t) {
						e.pending_buf[e.pending++] = t;
					}
					function v(e, t) {
						e.pending_buf[e.pending++] = t >>> 8 & 255, e.pending_buf[e.pending++] = 255 & t;
					}
					function y(e, t) {
						var n, r, o = e.max_chain_length, i = e.strstart, a = e.prev_length, s = e.nice_match, l = e.strstart > e.w_size - d ? e.strstart - (e.w_size - d) : 0, c = e.window, p = e.w_mask, f = e.prev, h = e.strstart + u, m = c[i + a - 1], g = c[i + a];
						e.prev_length >= e.good_match && (o >>= 2), s > e.lookahead && (s = e.lookahead);
						do
							if (c[(n = t) + a] === g && c[n + a - 1] === m && c[n] === c[i] && c[++n] === c[i + 1]) {
								i += 2, n++;
								do								;
while (c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && c[++i] === c[++n] && i < h);
								if (r = u - (h - i), i = h - u, a < r) {
									if (e.match_start = t, s <= (a = r)) break;
									m = c[i + a - 1], g = c[i + a];
								}
							}
						while ((t = f[t & p]) > l && 0 != --o);
						return a <= e.lookahead ? a : e.lookahead;
					}
					function x(e) {
						var t, n, r, i, l, c, u, p, f, h, m = e.w_size;
						do {
							if (i = e.window_size - e.lookahead - e.strstart, e.strstart >= m + (m - d)) {
								for (o.arraySet(e.window, e.window, m, m, 0), e.match_start -= m, e.strstart -= m, e.block_start -= m, t = n = e.hash_size; r = e.head[--t], e.head[t] = m <= r ? r - m : 0, --n;);
								for (t = n = m; r = e.prev[--t], e.prev[t] = m <= r ? r - m : 0, --n;);
								i += m;
							}
							if (0 === e.strm.avail_in) break;
							if (c = e.strm, u = e.window, p = e.strstart + e.lookahead, h = void 0, (f = i) < (h = c.avail_in) && (h = f), n = 0 === h ? 0 : (c.avail_in -= h, o.arraySet(u, c.input, c.next_in, h, p), 1 === c.state.wrap ? c.adler = a(c.adler, u, h, p) : 2 === c.state.wrap && (c.adler = s(c.adler, u, h, p)), c.next_in += h, c.total_in += h, h), e.lookahead += n, e.lookahead + e.insert >= 3) for (l = e.strstart - e.insert, e.ins_h = e.window[l], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + 3 - 1]) & e.hash_mask, e.prev[l & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = l, l++, e.insert--, !(e.lookahead + e.insert < 3)););
						} while (e.lookahead < d && 0 !== e.strm.avail_in);
					}
					function S(e, t) {
						for (var n, r;;) {
							if (e.lookahead < d) {
								if (x(e), e.lookahead < d && 0 === t) return 1;
								if (0 === e.lookahead) break;
							}
							if (n = 0, e.lookahead >= 3 && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), 0 !== n && e.strstart - n <= e.w_size - d && (e.match_length = y(e, n)), e.match_length >= 3) if (r = i._tr_tally(e, e.strstart - e.match_start, e.match_length - 3), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= 3) {
								for (e.match_length--; e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart, 0 != --e.match_length;);
								e.strstart++;
							} else e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
							else r = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
							if (r && (w(e, !1), 0 === e.strm.avail_out)) return 1;
						}
						return e.insert = e.strstart < 2 ? e.strstart : 2, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
					}
					function N(e, t) {
						for (var n, r, o;;) {
							if (e.lookahead < d) {
								if (x(e), e.lookahead < d && 0 === t) return 1;
								if (0 === e.lookahead) break;
							}
							if (n = 0, e.lookahead >= 3 && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = 2, 0 !== n && e.prev_length < e.max_lazy_match && e.strstart - n <= e.w_size - d && (e.match_length = y(e, n), e.match_length <= 5 && (1 === e.strategy || 3 === e.match_length && 4096 < e.strstart - e.match_start) && (e.match_length = 2)), e.prev_length >= 3 && e.match_length <= e.prev_length) {
								for (o = e.strstart + e.lookahead - 3, r = i._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - 3), e.lookahead -= e.prev_length - 1, e.prev_length -= 2; ++e.strstart <= o && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), 0 != --e.prev_length;);
								if (e.match_available = 0, e.match_length = 2, e.strstart++, r && (w(e, !1), 0 === e.strm.avail_out)) return 1;
							} else if (e.match_available) {
								if ((r = i._tr_tally(e, 0, e.window[e.strstart - 1])) && w(e, !1), e.strstart++, e.lookahead--, 0 === e.strm.avail_out) return 1;
							} else e.match_available = 1, e.strstart++, e.lookahead--;
						}
						return e.match_available && (r = i._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < 2 ? e.strstart : 2, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
					}
					function E(e, t, n, r, o) {
						this.good_length = e, this.max_lazy = t, this.nice_length = n, this.max_chain = r, this.func = o;
					}
					function k() {
						this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = 8, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(1146), this.dyn_dtree = new o.Buf16(122), this.bl_tree = new o.Buf16(78), m(this.dyn_ltree), m(this.dyn_dtree), m(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(16), this.heap = new o.Buf16(573), m(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(573), m(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
					}
					function T(e) {
						var t;
						return e && e.state ? (e.total_in = e.total_out = 0, e.data_type = 2, (t = e.state).pending = 0, t.pending_out = 0, t.wrap < 0 && (t.wrap = -t.wrap), t.status = t.wrap ? 42 : p, e.adler = 2 === t.wrap ? 0 : 1, t.last_flush = 0, i._tr_init(t), 0) : f(e, c);
					}
					function I(e) {
						var t = T(e);
						return 0 === t && function(e) {
							e.window_size = 2 * e.w_size, m(e.head), e.max_lazy_match = r[e.level].max_lazy, e.good_match = r[e.level].good_length, e.nice_match = r[e.level].nice_length, e.max_chain_length = r[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = 2, e.match_available = 0, e.ins_h = 0;
						}(e.state), t;
					}
					function _(e, t, n, r, i, a) {
						if (!e) return c;
						var s = 1;
						if (-1 === t && (t = 6), r < 0 ? (s = 0, r = -r) : 15 < r && (s = 2, r -= 16), i < 1 || 9 < i || 8 !== n || r < 8 || 15 < r || t < 0 || 9 < t || a < 0 || 4 < a) return f(e, c);
						8 === r && (r = 9);
						var l = new k();
						return (e.state = l).strm = e, l.wrap = s, l.gzhead = null, l.w_bits = r, l.w_size = 1 << l.w_bits, l.w_mask = l.w_size - 1, l.hash_bits = i + 7, l.hash_size = 1 << l.hash_bits, l.hash_mask = l.hash_size - 1, l.hash_shift = ~~((l.hash_bits + 3 - 1) / 3), l.window = new o.Buf8(2 * l.w_size), l.head = new o.Buf16(l.hash_size), l.prev = new o.Buf16(l.w_size), l.lit_bufsize = 1 << i + 6, l.pending_buf_size = 4 * l.lit_bufsize, l.pending_buf = new o.Buf8(l.pending_buf_size), l.d_buf = 1 * l.lit_bufsize, l.l_buf = 3 * l.lit_bufsize, l.level = t, l.strategy = a, l.method = n, I(e);
					}
					r = [
						new E(0, 0, 0, 0, function(e, t) {
							var n = 65535;
							for (n > e.pending_buf_size - 5 && (n = e.pending_buf_size - 5);;) {
								if (e.lookahead <= 1) {
									if (x(e), 0 === e.lookahead && 0 === t) return 1;
									if (0 === e.lookahead) break;
								}
								e.strstart += e.lookahead, e.lookahead = 0;
								var r = e.block_start + n;
								if ((0 === e.strstart || e.strstart >= r) && (e.lookahead = e.strstart - r, e.strstart = r, w(e, !1), 0 === e.strm.avail_out)) return 1;
								if (e.strstart - e.block_start >= e.w_size - d && (w(e, !1), 0 === e.strm.avail_out)) return 1;
							}
							return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : (e.strstart > e.block_start && (w(e, !1), e.strm.avail_out), 1);
						}),
						new E(4, 4, 8, 4, S),
						new E(4, 5, 16, 8, S),
						new E(4, 6, 32, 32, S),
						new E(4, 4, 16, 16, N),
						new E(8, 16, 32, 32, N),
						new E(8, 16, 128, 128, N),
						new E(8, 32, 128, 256, N),
						new E(32, 128, 258, 1024, N),
						new E(32, 258, 258, 4096, N)
					], n.deflateInit = function(e, t) {
						return _(e, t, 8, 15, 8, 0);
					}, n.deflateInit2 = _, n.deflateReset = I, n.deflateResetKeep = T, n.deflateSetHeader = function(e, t) {
						return e && e.state ? 2 !== e.state.wrap ? c : (e.state.gzhead = t, 0) : c;
					}, n.deflate = function(e, t) {
						var n, o, a, l;
						if (!e || !e.state || 5 < t || t < 0) return e ? f(e, c) : c;
						if (o = e.state, !e.output || !e.input && 0 !== e.avail_in || 666 === o.status && 4 !== t) return f(e, 0 === e.avail_out ? -5 : c);
						if (o.strm = e, n = o.last_flush, o.last_flush = t, 42 === o.status) if (2 === o.wrap) e.adler = 0, b(o, 31), b(o, 139), b(o, 8), o.gzhead ? (b(o, (o.gzhead.text ? 1 : 0) + (o.gzhead.hcrc ? 2 : 0) + (o.gzhead.extra ? 4 : 0) + (o.gzhead.name ? 8 : 0) + (o.gzhead.comment ? 16 : 0)), b(o, 255 & o.gzhead.time), b(o, o.gzhead.time >> 8 & 255), b(o, o.gzhead.time >> 16 & 255), b(o, o.gzhead.time >> 24 & 255), b(o, 9 === o.level ? 2 : 2 <= o.strategy || o.level < 2 ? 4 : 0), b(o, 255 & o.gzhead.os), o.gzhead.extra && o.gzhead.extra.length && (b(o, 255 & o.gzhead.extra.length), b(o, o.gzhead.extra.length >> 8 & 255)), o.gzhead.hcrc && (e.adler = s(e.adler, o.pending_buf, o.pending, 0)), o.gzindex = 0, o.status = 69) : (b(o, 0), b(o, 0), b(o, 0), b(o, 0), b(o, 0), b(o, 9 === o.level ? 2 : 2 <= o.strategy || o.level < 2 ? 4 : 0), b(o, 3), o.status = p);
						else {
							var d = 8 + (o.w_bits - 8 << 4) << 8;
							d |= (2 <= o.strategy || o.level < 2 ? 0 : o.level < 6 ? 1 : 6 === o.level ? 2 : 3) << 6, 0 !== o.strstart && (d |= 32), d += 31 - d % 31, o.status = p, v(o, d), 0 !== o.strstart && (v(o, e.adler >>> 16), v(o, 65535 & e.adler)), e.adler = 1;
						}
						if (69 === o.status) if (o.gzhead.extra) {
							for (a = o.pending; o.gzindex < (65535 & o.gzhead.extra.length) && (o.pending !== o.pending_buf_size || (o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), g(e), a = o.pending, o.pending !== o.pending_buf_size));) b(o, 255 & o.gzhead.extra[o.gzindex]), o.gzindex++;
							o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), o.gzindex === o.gzhead.extra.length && (o.gzindex = 0, o.status = 73);
						} else o.status = 73;
						if (73 === o.status) if (o.gzhead.name) {
							a = o.pending;
							do {
								if (o.pending === o.pending_buf_size && (o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), g(e), a = o.pending, o.pending === o.pending_buf_size)) {
									l = 1;
									break;
								}
								l = o.gzindex < o.gzhead.name.length ? 255 & o.gzhead.name.charCodeAt(o.gzindex++) : 0, b(o, l);
							} while (0 !== l);
							o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), 0 === l && (o.gzindex = 0, o.status = 91);
						} else o.status = 91;
						if (91 === o.status) if (o.gzhead.comment) {
							a = o.pending;
							do {
								if (o.pending === o.pending_buf_size && (o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), g(e), a = o.pending, o.pending === o.pending_buf_size)) {
									l = 1;
									break;
								}
								l = o.gzindex < o.gzhead.comment.length ? 255 & o.gzhead.comment.charCodeAt(o.gzindex++) : 0, b(o, l);
							} while (0 !== l);
							o.gzhead.hcrc && o.pending > a && (e.adler = s(e.adler, o.pending_buf, o.pending - a, a)), 0 === l && (o.status = 103);
						} else o.status = 103;
						if (103 === o.status && (o.gzhead.hcrc ? (o.pending + 2 > o.pending_buf_size && g(e), o.pending + 2 <= o.pending_buf_size && (b(o, 255 & e.adler), b(o, e.adler >> 8 & 255), e.adler = 0, o.status = p)) : o.status = p), 0 !== o.pending) {
							if (g(e), 0 === e.avail_out) return o.last_flush = -1, 0;
						} else if (0 === e.avail_in && h(t) <= h(n) && 4 !== t) return f(e, -5);
						if (666 === o.status && 0 !== e.avail_in) return f(e, -5);
						if (0 !== e.avail_in || 0 !== o.lookahead || 0 !== t && 666 !== o.status) {
							var y = 2 === o.strategy ? function(e, t) {
								for (var n;;) {
									if (0 === e.lookahead && (x(e), 0 === e.lookahead)) {
										if (0 === t) return 1;
										break;
									}
									if (e.match_length = 0, n = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, n && (w(e, !1), 0 === e.strm.avail_out)) return 1;
								}
								return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
							}(o, t) : 3 === o.strategy ? function(e, t) {
								for (var n, r, o, a, s = e.window;;) {
									if (e.lookahead <= u) {
										if (x(e), e.lookahead <= u && 0 === t) return 1;
										if (0 === e.lookahead) break;
									}
									if (e.match_length = 0, e.lookahead >= 3 && 0 < e.strstart && (r = s[o = e.strstart - 1]) === s[++o] && r === s[++o] && r === s[++o]) {
										a = e.strstart + u;
										do										;
while (r === s[++o] && r === s[++o] && r === s[++o] && r === s[++o] && r === s[++o] && r === s[++o] && r === s[++o] && r === s[++o] && o < a);
										e.match_length = u - (a - o), e.match_length > e.lookahead && (e.match_length = e.lookahead);
									}
									if (e.match_length >= 3 ? (n = i._tr_tally(e, 1, e.match_length - 3), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (n = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), n && (w(e, !1), 0 === e.strm.avail_out)) return 1;
								}
								return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
							}(o, t) : r[o.level].func(o, t);
							if (3 !== y && 4 !== y || (o.status = 666), 1 === y || 3 === y) return 0 === e.avail_out && (o.last_flush = -1), 0;
							if (2 === y && (1 === t ? i._tr_align(o) : 5 !== t && (i._tr_stored_block(o, 0, 0, !1), 3 === t && (m(o.head), 0 === o.lookahead && (o.strstart = 0, o.block_start = 0, o.insert = 0))), g(e), 0 === e.avail_out)) return o.last_flush = -1, 0;
						}
						return 4 !== t ? 0 : o.wrap <= 0 ? 1 : (2 === o.wrap ? (b(o, 255 & e.adler), b(o, e.adler >> 8 & 255), b(o, e.adler >> 16 & 255), b(o, e.adler >> 24 & 255), b(o, 255 & e.total_in), b(o, e.total_in >> 8 & 255), b(o, e.total_in >> 16 & 255), b(o, e.total_in >> 24 & 255)) : (v(o, e.adler >>> 16), v(o, 65535 & e.adler)), g(e), 0 < o.wrap && (o.wrap = -o.wrap), 0 !== o.pending ? 0 : 1);
					}, n.deflateEnd = function(e) {
						var t;
						return e && e.state ? 42 !== (t = e.state.status) && 69 !== t && 73 !== t && 91 !== t && 103 !== t && t !== p && 666 !== t ? f(e, c) : (e.state = null, t === p ? f(e, -3) : 0) : c;
					}, n.deflateSetDictionary = function(e, t) {
						var n, r, i, s, l, u, d, p, f = t.length;
						if (!e || !e.state) return c;
						if (2 === (s = (n = e.state).wrap) || 1 === s && 42 !== n.status || n.lookahead) return c;
						for (1 === s && (e.adler = a(e.adler, t, f, 0)), n.wrap = 0, f >= n.w_size && (0 === s && (m(n.head), n.strstart = 0, n.block_start = 0, n.insert = 0), p = new o.Buf8(n.w_size), o.arraySet(p, t, f - n.w_size, n.w_size, 0), t = p, f = n.w_size), l = e.avail_in, u = e.next_in, d = e.input, e.avail_in = f, e.next_in = 0, e.input = t, x(n); n.lookahead >= 3;) {
							for (r = n.strstart, i = n.lookahead - 2; n.ins_h = (n.ins_h << n.hash_shift ^ n.window[r + 3 - 1]) & n.hash_mask, n.prev[r & n.w_mask] = n.head[n.ins_h], n.head[n.ins_h] = r, r++, --i;);
							n.strstart = r, n.lookahead = 2, x(n);
						}
						return n.strstart += n.lookahead, n.block_start = n.strstart, n.insert = n.lookahead, n.lookahead = 0, n.match_length = n.prev_length = 2, n.match_available = 0, e.next_in = u, e.input = d, e.avail_in = l, n.wrap = s, 0;
					}, n.deflateInfo = "pako deflate (from Nodeca project)";
				}, {
					"../utils/common": 41,
					"./adler32": 43,
					"./crc32": 45,
					"./messages": 51,
					"./trees": 52
				}],
				47: [function(e, t, n) {
					"use strict";
					t.exports = function() {
						this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
					};
				}, {}],
				48: [function(e, t, n) {
					"use strict";
					t.exports = function(e, t) {
						var n, r, o, i, a, s, l, c, u, d, p, f, h, m, g, w, b, v, y, x, S, N, E = e.state, k = e.next_in, T = e.input;
						n = k + (e.avail_in - 5), r = e.next_out, N = e.output, o = r - (t - e.avail_out), i = r + (e.avail_out - 257), a = E.dmax, s = E.wsize, l = E.whave, c = E.wnext, u = E.window, d = E.hold, p = E.bits, f = E.lencode, h = E.distcode, m = (1 << E.lenbits) - 1, g = (1 << E.distbits) - 1;
						e: do {
							p < 15 && (d += T[k++] << p, p += 8, d += T[k++] << p, p += 8), w = f[d & m];
							t: for (;;) {
								if (d >>>= b = w >>> 24, p -= b, 0 == (b = w >>> 16 & 255)) N[r++] = 65535 & w;
								else {
									if (!(16 & b)) {
										if (!(64 & b)) {
											w = f[(65535 & w) + (d & (1 << b) - 1)];
											continue t;
										}
										if (32 & b) {
											E.mode = 12;
											break e;
										}
										e.msg = "invalid literal/length code", E.mode = 30;
										break e;
									}
									v = 65535 & w, (b &= 15) && (p < b && (d += T[k++] << p, p += 8), v += d & (1 << b) - 1, d >>>= b, p -= b), p < 15 && (d += T[k++] << p, p += 8, d += T[k++] << p, p += 8), w = h[d & g];
									n: for (;;) {
										if (d >>>= b = w >>> 24, p -= b, !(16 & (b = w >>> 16 & 255))) {
											if (!(64 & b)) {
												w = h[(65535 & w) + (d & (1 << b) - 1)];
												continue n;
											}
											e.msg = "invalid distance code", E.mode = 30;
											break e;
										}
										if (y = 65535 & w, p < (b &= 15) && (d += T[k++] << p, (p += 8) < b && (d += T[k++] << p, p += 8)), a < (y += d & (1 << b) - 1)) {
											e.msg = "invalid distance too far back", E.mode = 30;
											break e;
										}
										if (d >>>= b, p -= b, (b = r - o) < y) {
											if (l < (b = y - b) && E.sane) {
												e.msg = "invalid distance too far back", E.mode = 30;
												break e;
											}
											if (S = u, (x = 0) === c) {
												if (x += s - b, b < v) {
													for (v -= b; N[r++] = u[x++], --b;);
													x = r - y, S = N;
												}
											} else if (c < b) {
												if (x += s + c - b, (b -= c) < v) {
													for (v -= b; N[r++] = u[x++], --b;);
													if (x = 0, c < v) {
														for (v -= b = c; N[r++] = u[x++], --b;);
														x = r - y, S = N;
													}
												}
											} else if (x += c - b, b < v) {
												for (v -= b; N[r++] = u[x++], --b;);
												x = r - y, S = N;
											}
											for (; 2 < v;) N[r++] = S[x++], N[r++] = S[x++], N[r++] = S[x++], v -= 3;
											v && (N[r++] = S[x++], 1 < v && (N[r++] = S[x++]));
										} else {
											for (x = r - y; N[r++] = N[x++], N[r++] = N[x++], N[r++] = N[x++], 2 < (v -= 3););
											v && (N[r++] = N[x++], 1 < v && (N[r++] = N[x++]));
										}
										break;
									}
								}
								break;
							}
						} while (k < n && r < i);
						k -= v = p >> 3, d &= (1 << (p -= v << 3)) - 1, e.next_in = k, e.next_out = r, e.avail_in = k < n ? n - k + 5 : 5 - (k - n), e.avail_out = r < i ? i - r + 257 : 257 - (r - i), E.hold = d, E.bits = p;
					};
				}, {}],
				49: [function(e, t, n) {
					"use strict";
					var r = e("../utils/common"), o = e("./adler32"), i = e("./crc32"), a = e("./inffast"), s = e("./inftrees"), l = -2;
					function c(e) {
						return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((65280 & e) << 8) + ((255 & e) << 24);
					}
					function u() {
						this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new r.Buf16(320), this.work = new r.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
					}
					function d(e) {
						var t;
						return e && e.state ? (t = e.state, e.total_in = e.total_out = t.total = 0, e.msg = "", t.wrap && (e.adler = 1 & t.wrap), t.mode = 1, t.last = 0, t.havedict = 0, t.dmax = 32768, t.head = null, t.hold = 0, t.bits = 0, t.lencode = t.lendyn = new r.Buf32(852), t.distcode = t.distdyn = new r.Buf32(592), t.sane = 1, t.back = -1, 0) : l;
					}
					function p(e) {
						var t;
						return e && e.state ? ((t = e.state).wsize = 0, t.whave = 0, t.wnext = 0, d(e)) : l;
					}
					function f(e, t) {
						var n, r;
						return e && e.state ? (r = e.state, t < 0 ? (n = 0, t = -t) : (n = 1 + (t >> 4), t < 48 && (t &= 15)), t && (t < 8 || 15 < t) ? l : (null !== r.window && r.wbits !== t && (r.window = null), r.wrap = n, r.wbits = t, p(e))) : l;
					}
					function h(e, t) {
						var n, r;
						return e ? (r = new u(), (e.state = r).window = null, 0 !== (n = f(e, t)) && (e.state = null), n) : l;
					}
					var m, g, w = !0;
					function b(e) {
						if (w) {
							var t;
							for (m = new r.Buf32(512), g = new r.Buf32(32), t = 0; t < 144;) e.lens[t++] = 8;
							for (; t < 256;) e.lens[t++] = 9;
							for (; t < 280;) e.lens[t++] = 7;
							for (; t < 288;) e.lens[t++] = 8;
							for (s(1, e.lens, 0, 288, m, 0, e.work, { bits: 9 }), t = 0; t < 32;) e.lens[t++] = 5;
							s(2, e.lens, 0, 32, g, 0, e.work, { bits: 5 }), w = !1;
						}
						e.lencode = m, e.lenbits = 9, e.distcode = g, e.distbits = 5;
					}
					function v(e, t, n, o) {
						var i, a = e.state;
						return null === a.window && (a.wsize = 1 << a.wbits, a.wnext = 0, a.whave = 0, a.window = new r.Buf8(a.wsize)), o >= a.wsize ? (r.arraySet(a.window, t, n - a.wsize, a.wsize, 0), a.wnext = 0, a.whave = a.wsize) : (o < (i = a.wsize - a.wnext) && (i = o), r.arraySet(a.window, t, n - o, i, a.wnext), (o -= i) ? (r.arraySet(a.window, t, n - o, o, 0), a.wnext = o, a.whave = a.wsize) : (a.wnext += i, a.wnext === a.wsize && (a.wnext = 0), a.whave < a.wsize && (a.whave += i))), 0;
					}
					n.inflateReset = p, n.inflateReset2 = f, n.inflateResetKeep = d, n.inflateInit = function(e) {
						return h(e, 15);
					}, n.inflateInit2 = h, n.inflate = function(e, t) {
						var n, u, d, p, f, h, m, g, w, y, x, S, N, E, k, T, I, _, C, A, R, $, D, P, M = 0, F = new r.Buf8(4), O = [
							16,
							17,
							18,
							0,
							8,
							7,
							9,
							6,
							10,
							5,
							11,
							4,
							12,
							3,
							13,
							2,
							14,
							1,
							15
						];
						if (!e || !e.state || !e.output || !e.input && 0 !== e.avail_in) return l;
						12 === (n = e.state).mode && (n.mode = 13), f = e.next_out, d = e.output, m = e.avail_out, p = e.next_in, u = e.input, h = e.avail_in, g = n.hold, w = n.bits, y = h, x = m, $ = 0;
						e: for (;;) switch (n.mode) {
							case 1:
								if (0 === n.wrap) {
									n.mode = 13;
									break;
								}
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (2 & n.wrap && 35615 === g) {
									F[n.check = 0] = 255 & g, F[1] = g >>> 8 & 255, n.check = i(n.check, F, 2, 0), w = g = 0, n.mode = 2;
									break;
								}
								if (n.flags = 0, n.head && (n.head.done = !1), !(1 & n.wrap) || (((255 & g) << 8) + (g >> 8)) % 31) {
									e.msg = "incorrect header check", n.mode = 30;
									break;
								}
								if (8 != (15 & g)) {
									e.msg = "unknown compression method", n.mode = 30;
									break;
								}
								if (w -= 4, R = 8 + (15 & (g >>>= 4)), 0 === n.wbits) n.wbits = R;
								else if (R > n.wbits) {
									e.msg = "invalid window size", n.mode = 30;
									break;
								}
								n.dmax = 1 << R, e.adler = n.check = 1, n.mode = 512 & g ? 10 : 12, w = g = 0;
								break;
							case 2:
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (n.flags = g, 8 != (255 & n.flags)) {
									e.msg = "unknown compression method", n.mode = 30;
									break;
								}
								if (57344 & n.flags) {
									e.msg = "unknown header flags set", n.mode = 30;
									break;
								}
								n.head && (n.head.text = g >> 8 & 1), 512 & n.flags && (F[0] = 255 & g, F[1] = g >>> 8 & 255, n.check = i(n.check, F, 2, 0)), w = g = 0, n.mode = 3;
							case 3:
								for (; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								n.head && (n.head.time = g), 512 & n.flags && (F[0] = 255 & g, F[1] = g >>> 8 & 255, F[2] = g >>> 16 & 255, F[3] = g >>> 24 & 255, n.check = i(n.check, F, 4, 0)), w = g = 0, n.mode = 4;
							case 4:
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								n.head && (n.head.xflags = 255 & g, n.head.os = g >> 8), 512 & n.flags && (F[0] = 255 & g, F[1] = g >>> 8 & 255, n.check = i(n.check, F, 2, 0)), w = g = 0, n.mode = 5;
							case 5:
								if (1024 & n.flags) {
									for (; w < 16;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									n.length = g, n.head && (n.head.extra_len = g), 512 & n.flags && (F[0] = 255 & g, F[1] = g >>> 8 & 255, n.check = i(n.check, F, 2, 0)), w = g = 0;
								} else n.head && (n.head.extra = null);
								n.mode = 6;
							case 6:
								if (1024 & n.flags && (h < (S = n.length) && (S = h), S && (n.head && (R = n.head.extra_len - n.length, n.head.extra || (n.head.extra = new Array(n.head.extra_len)), r.arraySet(n.head.extra, u, p, S, R)), 512 & n.flags && (n.check = i(n.check, u, S, p)), h -= S, p += S, n.length -= S), n.length)) break e;
								n.length = 0, n.mode = 7;
							case 7:
								if (2048 & n.flags) {
									if (0 === h) break e;
									for (S = 0; R = u[p + S++], n.head && R && n.length < 65536 && (n.head.name += String.fromCharCode(R)), R && S < h;);
									if (512 & n.flags && (n.check = i(n.check, u, S, p)), h -= S, p += S, R) break e;
								} else n.head && (n.head.name = null);
								n.length = 0, n.mode = 8;
							case 8:
								if (4096 & n.flags) {
									if (0 === h) break e;
									for (S = 0; R = u[p + S++], n.head && R && n.length < 65536 && (n.head.comment += String.fromCharCode(R)), R && S < h;);
									if (512 & n.flags && (n.check = i(n.check, u, S, p)), h -= S, p += S, R) break e;
								} else n.head && (n.head.comment = null);
								n.mode = 9;
							case 9:
								if (512 & n.flags) {
									for (; w < 16;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (g !== (65535 & n.check)) {
										e.msg = "header crc mismatch", n.mode = 30;
										break;
									}
									w = g = 0;
								}
								n.head && (n.head.hcrc = n.flags >> 9 & 1, n.head.done = !0), e.adler = n.check = 0, n.mode = 12;
								break;
							case 10:
								for (; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								e.adler = n.check = c(g), w = g = 0, n.mode = 11;
							case 11:
								if (0 === n.havedict) return e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, n.hold = g, n.bits = w, 2;
								e.adler = n.check = 1, n.mode = 12;
							case 12: if (5 === t || 6 === t) break e;
							case 13:
								if (n.last) {
									g >>>= 7 & w, w -= 7 & w, n.mode = 27;
									break;
								}
								for (; w < 3;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								switch (n.last = 1 & g, w -= 1, 3 & (g >>>= 1)) {
									case 0:
										n.mode = 14;
										break;
									case 1:
										if (b(n), n.mode = 20, 6 !== t) break;
										g >>>= 2, w -= 2;
										break e;
									case 2:
										n.mode = 17;
										break;
									case 3: e.msg = "invalid block type", n.mode = 30;
								}
								g >>>= 2, w -= 2;
								break;
							case 14:
								for (g >>>= 7 & w, w -= 7 & w; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if ((65535 & g) != (g >>> 16 ^ 65535)) {
									e.msg = "invalid stored block lengths", n.mode = 30;
									break;
								}
								if (n.length = 65535 & g, w = g = 0, n.mode = 15, 6 === t) break e;
							case 15: n.mode = 16;
							case 16:
								if (S = n.length) {
									if (h < S && (S = h), m < S && (S = m), 0 === S) break e;
									r.arraySet(d, u, p, S, f), h -= S, p += S, m -= S, f += S, n.length -= S;
									break;
								}
								n.mode = 12;
								break;
							case 17:
								for (; w < 14;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (n.nlen = 257 + (31 & g), g >>>= 5, w -= 5, n.ndist = 1 + (31 & g), g >>>= 5, w -= 5, n.ncode = 4 + (15 & g), g >>>= 4, w -= 4, 286 < n.nlen || 30 < n.ndist) {
									e.msg = "too many length or distance symbols", n.mode = 30;
									break;
								}
								n.have = 0, n.mode = 18;
							case 18:
								for (; n.have < n.ncode;) {
									for (; w < 3;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									n.lens[O[n.have++]] = 7 & g, g >>>= 3, w -= 3;
								}
								for (; n.have < 19;) n.lens[O[n.have++]] = 0;
								if (n.lencode = n.lendyn, n.lenbits = 7, D = { bits: n.lenbits }, $ = s(0, n.lens, 0, 19, n.lencode, 0, n.work, D), n.lenbits = D.bits, $) {
									e.msg = "invalid code lengths set", n.mode = 30;
									break;
								}
								n.have = 0, n.mode = 19;
							case 19:
								for (; n.have < n.nlen + n.ndist;) {
									for (; T = (M = n.lencode[g & (1 << n.lenbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (I < 16) g >>>= k, w -= k, n.lens[n.have++] = I;
									else {
										if (16 === I) {
											for (P = k + 2; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											if (g >>>= k, w -= k, 0 === n.have) {
												e.msg = "invalid bit length repeat", n.mode = 30;
												break;
											}
											R = n.lens[n.have - 1], S = 3 + (3 & g), g >>>= 2, w -= 2;
										} else if (17 === I) {
											for (P = k + 3; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											w -= k, R = 0, S = 3 + (7 & (g >>>= k)), g >>>= 3, w -= 3;
										} else {
											for (P = k + 7; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											w -= k, R = 0, S = 11 + (127 & (g >>>= k)), g >>>= 7, w -= 7;
										}
										if (n.have + S > n.nlen + n.ndist) {
											e.msg = "invalid bit length repeat", n.mode = 30;
											break;
										}
										for (; S--;) n.lens[n.have++] = R;
									}
								}
								if (30 === n.mode) break;
								if (0 === n.lens[256]) {
									e.msg = "invalid code -- missing end-of-block", n.mode = 30;
									break;
								}
								if (n.lenbits = 9, D = { bits: n.lenbits }, $ = s(1, n.lens, 0, n.nlen, n.lencode, 0, n.work, D), n.lenbits = D.bits, $) {
									e.msg = "invalid literal/lengths set", n.mode = 30;
									break;
								}
								if (n.distbits = 6, n.distcode = n.distdyn, D = { bits: n.distbits }, $ = s(2, n.lens, n.nlen, n.ndist, n.distcode, 0, n.work, D), n.distbits = D.bits, $) {
									e.msg = "invalid distances set", n.mode = 30;
									break;
								}
								if (n.mode = 20, 6 === t) break e;
							case 20: n.mode = 21;
							case 21:
								if (6 <= h && 258 <= m) {
									e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, n.hold = g, n.bits = w, a(e, x), f = e.next_out, d = e.output, m = e.avail_out, p = e.next_in, u = e.input, h = e.avail_in, g = n.hold, w = n.bits, 12 === n.mode && (n.back = -1);
									break;
								}
								for (n.back = 0; T = (M = n.lencode[g & (1 << n.lenbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (T && !(240 & T)) {
									for (_ = k, C = T, A = I; T = (M = n.lencode[A + ((g & (1 << _ + C) - 1) >> _)]) >>> 16 & 255, I = 65535 & M, !(_ + (k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= _, w -= _, n.back += _;
								}
								if (g >>>= k, w -= k, n.back += k, n.length = I, 0 === T) {
									n.mode = 26;
									break;
								}
								if (32 & T) {
									n.back = -1, n.mode = 12;
									break;
								}
								if (64 & T) {
									e.msg = "invalid literal/length code", n.mode = 30;
									break;
								}
								n.extra = 15 & T, n.mode = 22;
							case 22:
								if (n.extra) {
									for (P = n.extra; w < P;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									n.length += g & (1 << n.extra) - 1, g >>>= n.extra, w -= n.extra, n.back += n.extra;
								}
								n.was = n.length, n.mode = 23;
							case 23:
								for (; T = (M = n.distcode[g & (1 << n.distbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (!(240 & T)) {
									for (_ = k, C = T, A = I; T = (M = n.distcode[A + ((g & (1 << _ + C) - 1) >> _)]) >>> 16 & 255, I = 65535 & M, !(_ + (k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= _, w -= _, n.back += _;
								}
								if (g >>>= k, w -= k, n.back += k, 64 & T) {
									e.msg = "invalid distance code", n.mode = 30;
									break;
								}
								n.offset = I, n.extra = 15 & T, n.mode = 24;
							case 24:
								if (n.extra) {
									for (P = n.extra; w < P;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									n.offset += g & (1 << n.extra) - 1, g >>>= n.extra, w -= n.extra, n.back += n.extra;
								}
								if (n.offset > n.dmax) {
									e.msg = "invalid distance too far back", n.mode = 30;
									break;
								}
								n.mode = 25;
							case 25:
								if (0 === m) break e;
								if (S = x - m, n.offset > S) {
									if ((S = n.offset - S) > n.whave && n.sane) {
										e.msg = "invalid distance too far back", n.mode = 30;
										break;
									}
									N = S > n.wnext ? (S -= n.wnext, n.wsize - S) : n.wnext - S, S > n.length && (S = n.length), E = n.window;
								} else E = d, N = f - n.offset, S = n.length;
								for (m < S && (S = m), m -= S, n.length -= S; d[f++] = E[N++], --S;);
								0 === n.length && (n.mode = 21);
								break;
							case 26:
								if (0 === m) break e;
								d[f++] = n.length, m--, n.mode = 21;
								break;
							case 27:
								if (n.wrap) {
									for (; w < 32;) {
										if (0 === h) break e;
										h--, g |= u[p++] << w, w += 8;
									}
									if (x -= m, e.total_out += x, n.total += x, x && (e.adler = n.check = n.flags ? i(n.check, d, x, f - x) : o(n.check, d, x, f - x)), x = m, (n.flags ? g : c(g)) !== n.check) {
										e.msg = "incorrect data check", n.mode = 30;
										break;
									}
									w = g = 0;
								}
								n.mode = 28;
							case 28:
								if (n.wrap && n.flags) {
									for (; w < 32;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (g !== (4294967295 & n.total)) {
										e.msg = "incorrect length check", n.mode = 30;
										break;
									}
									w = g = 0;
								}
								n.mode = 29;
							case 29:
								$ = 1;
								break e;
							case 30:
								$ = -3;
								break e;
							case 31: return -4;
							default: return l;
						}
						return e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, n.hold = g, n.bits = w, (n.wsize || x !== e.avail_out && n.mode < 30 && (n.mode < 27 || 4 !== t)) && v(e, e.output, e.next_out, x - e.avail_out) ? (n.mode = 31, -4) : (y -= e.avail_in, x -= e.avail_out, e.total_in += y, e.total_out += x, n.total += x, n.wrap && x && (e.adler = n.check = n.flags ? i(n.check, d, x, e.next_out - x) : o(n.check, d, x, e.next_out - x)), e.data_type = n.bits + (n.last ? 64 : 0) + (12 === n.mode ? 128 : 0) + (20 === n.mode || 15 === n.mode ? 256 : 0), (0 == y && 0 === x || 4 === t) && 0 === $ && ($ = -5), $);
					}, n.inflateEnd = function(e) {
						if (!e || !e.state) return l;
						var t = e.state;
						return t.window && (t.window = null), e.state = null, 0;
					}, n.inflateGetHeader = function(e, t) {
						var n;
						return e && e.state && 2 & (n = e.state).wrap ? ((n.head = t).done = !1, 0) : l;
					}, n.inflateSetDictionary = function(e, t) {
						var n, r = t.length;
						return e && e.state ? 0 !== (n = e.state).wrap && 11 !== n.mode ? l : 11 === n.mode && o(1, t, r, 0) !== n.check ? -3 : v(e, t, r, r) ? (n.mode = 31, -4) : (n.havedict = 1, 0) : l;
					}, n.inflateInfo = "pako inflate (from Nodeca project)";
				}, {
					"../utils/common": 41,
					"./adler32": 43,
					"./crc32": 45,
					"./inffast": 48,
					"./inftrees": 50
				}],
				50: [function(e, t, n) {
					"use strict";
					var r = e("../utils/common"), o = [
						3,
						4,
						5,
						6,
						7,
						8,
						9,
						10,
						11,
						13,
						15,
						17,
						19,
						23,
						27,
						31,
						35,
						43,
						51,
						59,
						67,
						83,
						99,
						115,
						131,
						163,
						195,
						227,
						258,
						0,
						0
					], i = [
						16,
						16,
						16,
						16,
						16,
						16,
						16,
						16,
						17,
						17,
						17,
						17,
						18,
						18,
						18,
						18,
						19,
						19,
						19,
						19,
						20,
						20,
						20,
						20,
						21,
						21,
						21,
						21,
						16,
						72,
						78
					], a = [
						1,
						2,
						3,
						4,
						5,
						7,
						9,
						13,
						17,
						25,
						33,
						49,
						65,
						97,
						129,
						193,
						257,
						385,
						513,
						769,
						1025,
						1537,
						2049,
						3073,
						4097,
						6145,
						8193,
						12289,
						16385,
						24577,
						0,
						0
					], s = [
						16,
						16,
						16,
						16,
						17,
						17,
						18,
						18,
						19,
						19,
						20,
						20,
						21,
						21,
						22,
						22,
						23,
						23,
						24,
						24,
						25,
						25,
						26,
						26,
						27,
						27,
						28,
						28,
						29,
						29,
						64,
						64
					];
					t.exports = function(e, t, n, l, c, u, d, p) {
						var f, h, m, g, w, b, v, y, x, S = p.bits, N = 0, E = 0, k = 0, T = 0, I = 0, _ = 0, C = 0, A = 0, R = 0, $ = 0, D = null, P = 0, M = new r.Buf16(16), F = new r.Buf16(16), O = null, L = 0;
						for (N = 0; N <= 15; N++) M[N] = 0;
						for (E = 0; E < l; E++) M[t[n + E]]++;
						for (I = S, T = 15; 1 <= T && 0 === M[T]; T--);
						if (T < I && (I = T), 0 === T) return c[u++] = 20971520, c[u++] = 20971520, p.bits = 1, 0;
						for (k = 1; k < T && 0 === M[k]; k++);
						for (I < k && (I = k), N = A = 1; N <= 15; N++) if (A <<= 1, (A -= M[N]) < 0) return -1;
						if (0 < A && (0 === e || 1 !== T)) return -1;
						for (F[1] = 0, N = 1; N < 15; N++) F[N + 1] = F[N] + M[N];
						for (E = 0; E < l; E++) 0 !== t[n + E] && (d[F[t[n + E]]++] = E);
						if (b = 0 === e ? (D = O = d, 19) : 1 === e ? (D = o, P -= 257, O = i, L -= 257, 256) : (D = a, O = s, -1), N = k, w = u, C = E = $ = 0, m = -1, g = (R = 1 << (_ = I)) - 1, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
						for (;;) {
							for (v = N - C, x = d[E] < b ? (y = 0, d[E]) : d[E] > b ? (y = O[L + d[E]], D[P + d[E]]) : (y = 96, 0), f = 1 << N - C, k = h = 1 << _; c[w + ($ >> C) + (h -= f)] = v << 24 | y << 16 | x, 0 !== h;);
							for (f = 1 << N - 1; $ & f;) f >>= 1;
							if (0 !== f ? ($ &= f - 1, $ += f) : $ = 0, E++, 0 == --M[N]) {
								if (N === T) break;
								N = t[n + d[E]];
							}
							if (I < N && ($ & g) !== m) {
								for (0 === C && (C = I), w += k, A = 1 << (_ = N - C); _ + C < T && !((A -= M[_ + C]) <= 0);) _++, A <<= 1;
								if (R += 1 << _, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
								c[m = $ & g] = I << 24 | _ << 16 | w - u;
							}
						}
						return 0 !== $ && (c[w + $] = N - C << 24 | 4194304), p.bits = I, 0;
					};
				}, { "../utils/common": 41 }],
				51: [function(e, t, n) {
					"use strict";
					t.exports = {
						2: "need dictionary",
						1: "stream end",
						0: "",
						"-1": "file error",
						"-2": "stream error",
						"-3": "data error",
						"-4": "insufficient memory",
						"-5": "buffer error",
						"-6": "incompatible version"
					};
				}, {}],
				52: [function(e, t, n) {
					"use strict";
					var r = e("../utils/common");
					function o(e) {
						for (var t = e.length; 0 <= --t;) e[t] = 0;
					}
					var i = 256, a = 286, s = 30, l = 15, c = [
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						1,
						1,
						1,
						1,
						2,
						2,
						2,
						2,
						3,
						3,
						3,
						3,
						4,
						4,
						4,
						4,
						5,
						5,
						5,
						5,
						0
					], u = [
						0,
						0,
						0,
						0,
						1,
						1,
						2,
						2,
						3,
						3,
						4,
						4,
						5,
						5,
						6,
						6,
						7,
						7,
						8,
						8,
						9,
						9,
						10,
						10,
						11,
						11,
						12,
						12,
						13,
						13
					], d = [
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						2,
						3,
						7
					], p = [
						16,
						17,
						18,
						0,
						8,
						7,
						9,
						6,
						10,
						5,
						11,
						4,
						12,
						3,
						13,
						2,
						14,
						1,
						15
					], f = new Array(576);
					o(f);
					var h = new Array(60);
					o(h);
					var m = new Array(512);
					o(m);
					var g = new Array(256);
					o(g);
					var w = new Array(29);
					o(w);
					var b, v, y, x = new Array(s);
					function S(e, t, n, r, o) {
						this.static_tree = e, this.extra_bits = t, this.extra_base = n, this.elems = r, this.max_length = o, this.has_stree = e && e.length;
					}
					function N(e, t) {
						this.dyn_tree = e, this.max_code = 0, this.stat_desc = t;
					}
					function E(e) {
						return e < 256 ? m[e] : m[256 + (e >>> 7)];
					}
					function k(e, t) {
						e.pending_buf[e.pending++] = 255 & t, e.pending_buf[e.pending++] = t >>> 8 & 255;
					}
					function T(e, t, n) {
						e.bi_valid > 16 - n ? (e.bi_buf |= t << e.bi_valid & 65535, k(e, e.bi_buf), e.bi_buf = t >> 16 - e.bi_valid, e.bi_valid += n - 16) : (e.bi_buf |= t << e.bi_valid & 65535, e.bi_valid += n);
					}
					function I(e, t, n) {
						T(e, n[2 * t], n[2 * t + 1]);
					}
					function _(e, t) {
						for (var n = 0; n |= 1 & e, e >>>= 1, n <<= 1, 0 < --t;);
						return n >>> 1;
					}
					function C(e, t, n) {
						var r, o, i = new Array(16), a = 0;
						for (r = 1; r <= l; r++) i[r] = a = a + n[r - 1] << 1;
						for (o = 0; o <= t; o++) {
							var s = e[2 * o + 1];
							0 !== s && (e[2 * o] = _(i[s]++, s));
						}
					}
					function A(e) {
						for (var t = 0; t < a; t++) e.dyn_ltree[2 * t] = 0;
						for (t = 0; t < s; t++) e.dyn_dtree[2 * t] = 0;
						for (t = 0; t < 19; t++) e.bl_tree[2 * t] = 0;
						e.dyn_ltree[512] = 1, e.opt_len = e.static_len = 0, e.last_lit = e.matches = 0;
					}
					function R(e) {
						8 < e.bi_valid ? k(e, e.bi_buf) : 0 < e.bi_valid && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
					}
					function $(e, t, n, r) {
						var o = 2 * t, i = 2 * n;
						return e[o] < e[i] || e[o] === e[i] && r[t] <= r[n];
					}
					function D(e, t, n) {
						for (var r = e.heap[n], o = n << 1; o <= e.heap_len && (o < e.heap_len && $(t, e.heap[o + 1], e.heap[o], e.depth) && o++, !$(t, r, e.heap[o], e.depth));) e.heap[n] = e.heap[o], n = o, o <<= 1;
						e.heap[n] = r;
					}
					function P(e, t, n) {
						var r, o, a, s, l = 0;
						if (0 !== e.last_lit) for (; r = e.pending_buf[e.d_buf + 2 * l] << 8 | e.pending_buf[e.d_buf + 2 * l + 1], o = e.pending_buf[e.l_buf + l], l++, 0 === r ? I(e, o, t) : (I(e, (a = g[o]) + i + 1, t), 0 !== (s = c[a]) && T(e, o -= w[a], s), I(e, a = E(--r), n), 0 !== (s = u[a]) && T(e, r -= x[a], s)), l < e.last_lit;);
						I(e, 256, t);
					}
					function M(e, t) {
						var n, r, o, i = t.dyn_tree, a = t.stat_desc.static_tree, s = t.stat_desc.has_stree, c = t.stat_desc.elems, u = -1;
						for (e.heap_len = 0, e.heap_max = 573, n = 0; n < c; n++) 0 !== i[2 * n] ? (e.heap[++e.heap_len] = u = n, e.depth[n] = 0) : i[2 * n + 1] = 0;
						for (; e.heap_len < 2;) i[2 * (o = e.heap[++e.heap_len] = u < 2 ? ++u : 0)] = 1, e.depth[o] = 0, e.opt_len--, s && (e.static_len -= a[2 * o + 1]);
						for (t.max_code = u, n = e.heap_len >> 1; 1 <= n; n--) D(e, i, n);
						for (o = c; n = e.heap[1], e.heap[1] = e.heap[e.heap_len--], D(e, i, 1), r = e.heap[1], e.heap[--e.heap_max] = n, e.heap[--e.heap_max] = r, i[2 * o] = i[2 * n] + i[2 * r], e.depth[o] = (e.depth[n] >= e.depth[r] ? e.depth[n] : e.depth[r]) + 1, i[2 * n + 1] = i[2 * r + 1] = o, e.heap[1] = o++, D(e, i, 1), 2 <= e.heap_len;);
						e.heap[--e.heap_max] = e.heap[1], function(e, t) {
							var n, r, o, i, a, s, c = t.dyn_tree, u = t.max_code, d = t.stat_desc.static_tree, p = t.stat_desc.has_stree, f = t.stat_desc.extra_bits, h = t.stat_desc.extra_base, m = t.stat_desc.max_length, g = 0;
							for (i = 0; i <= l; i++) e.bl_count[i] = 0;
							for (c[2 * e.heap[e.heap_max] + 1] = 0, n = e.heap_max + 1; n < 573; n++) m < (i = c[2 * c[2 * (r = e.heap[n]) + 1] + 1] + 1) && (i = m, g++), c[2 * r + 1] = i, u < r || (e.bl_count[i]++, a = 0, h <= r && (a = f[r - h]), s = c[2 * r], e.opt_len += s * (i + a), p && (e.static_len += s * (d[2 * r + 1] + a)));
							if (0 !== g) {
								do {
									for (i = m - 1; 0 === e.bl_count[i];) i--;
									e.bl_count[i]--, e.bl_count[i + 1] += 2, e.bl_count[m]--, g -= 2;
								} while (0 < g);
								for (i = m; 0 !== i; i--) for (r = e.bl_count[i]; 0 !== r;) u < (o = e.heap[--n]) || (c[2 * o + 1] !== i && (e.opt_len += (i - c[2 * o + 1]) * c[2 * o], c[2 * o + 1] = i), r--);
							}
						}(e, t), C(i, u, e.bl_count);
					}
					function F(e, t, n) {
						var r, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), t[2 * (n + 1) + 1] = 65535, r = 0; r <= n; r++) o = a, a = t[2 * (r + 1) + 1], ++s < l && o === a || (s < c ? e.bl_tree[2 * o] += s : 0 !== o ? (o !== i && e.bl_tree[2 * o]++, e.bl_tree[32]++) : s <= 10 ? e.bl_tree[34]++ : e.bl_tree[36]++, i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4));
					}
					function O(e, t, n) {
						var r, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), r = 0; r <= n; r++) if (o = a, a = t[2 * (r + 1) + 1], !(++s < l && o === a)) {
							if (s < c) for (; I(e, o, e.bl_tree), 0 != --s;);
							else 0 !== o ? (o !== i && (I(e, o, e.bl_tree), s--), I(e, 16, e.bl_tree), T(e, s - 3, 2)) : s <= 10 ? (I(e, 17, e.bl_tree), T(e, s - 3, 3)) : (I(e, 18, e.bl_tree), T(e, s - 11, 7));
							i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4);
						}
					}
					o(x);
					var L = !1;
					function B(e, t, n, o) {
						T(e, 0 + (o ? 1 : 0), 3), function(e, t, n) {
							R(e), k(e, n), k(e, ~n), r.arraySet(e.pending_buf, e.window, t, n, e.pending), e.pending += n;
						}(e, t, n);
					}
					n._tr_init = function(e) {
						L || (function() {
							var e, t, n, r, o, i = new Array(16);
							for (r = n = 0; r < 28; r++) for (w[r] = n, e = 0; e < 1 << c[r]; e++) g[n++] = r;
							for (g[n - 1] = r, r = o = 0; r < 16; r++) for (x[r] = o, e = 0; e < 1 << u[r]; e++) m[o++] = r;
							for (o >>= 7; r < s; r++) for (x[r] = o << 7, e = 0; e < 1 << u[r] - 7; e++) m[256 + o++] = r;
							for (t = 0; t <= l; t++) i[t] = 0;
							for (e = 0; e <= 143;) f[2 * e + 1] = 8, e++, i[8]++;
							for (; e <= 255;) f[2 * e + 1] = 9, e++, i[9]++;
							for (; e <= 279;) f[2 * e + 1] = 7, e++, i[7]++;
							for (; e <= 287;) f[2 * e + 1] = 8, e++, i[8]++;
							for (C(f, 287, i), e = 0; e < s; e++) h[2 * e + 1] = 5, h[2 * e] = _(e, 5);
							b = new S(f, c, 257, a, l), v = new S(h, u, 0, s, l), y = new S(new Array(0), d, 0, 19, 7);
						}(), L = !0), e.l_desc = new N(e.dyn_ltree, b), e.d_desc = new N(e.dyn_dtree, v), e.bl_desc = new N(e.bl_tree, y), e.bi_buf = 0, e.bi_valid = 0, A(e);
					}, n._tr_stored_block = B, n._tr_flush_block = function(e, t, n, r) {
						var o, a, s = 0;
						0 < e.level ? (2 === e.strm.data_type && (e.strm.data_type = function(e) {
							var t, n = 4093624447;
							for (t = 0; t <= 31; t++, n >>>= 1) if (1 & n && 0 !== e.dyn_ltree[2 * t]) return 0;
							if (0 !== e.dyn_ltree[18] || 0 !== e.dyn_ltree[20] || 0 !== e.dyn_ltree[26]) return 1;
							for (t = 32; t < i; t++) if (0 !== e.dyn_ltree[2 * t]) return 1;
							return 0;
						}(e)), M(e, e.l_desc), M(e, e.d_desc), s = function(e) {
							var t;
							for (F(e, e.dyn_ltree, e.l_desc.max_code), F(e, e.dyn_dtree, e.d_desc.max_code), M(e, e.bl_desc), t = 18; 3 <= t && 0 === e.bl_tree[2 * p[t] + 1]; t--);
							return e.opt_len += 3 * (t + 1) + 5 + 5 + 4, t;
						}(e), o = e.opt_len + 3 + 7 >>> 3, (a = e.static_len + 3 + 7 >>> 3) <= o && (o = a)) : o = a = n + 5, n + 4 <= o && -1 !== t ? B(e, t, n, r) : 4 === e.strategy || a === o ? (T(e, 2 + (r ? 1 : 0), 3), P(e, f, h)) : (T(e, 4 + (r ? 1 : 0), 3), function(e, t, n, r) {
							var o;
							for (T(e, t - 257, 5), T(e, n - 1, 5), T(e, r - 4, 4), o = 0; o < r; o++) T(e, e.bl_tree[2 * p[o] + 1], 3);
							O(e, e.dyn_ltree, t - 1), O(e, e.dyn_dtree, n - 1);
						}(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, s + 1), P(e, e.dyn_ltree, e.dyn_dtree)), A(e), r && R(e);
					}, n._tr_tally = function(e, t, n) {
						return e.pending_buf[e.d_buf + 2 * e.last_lit] = t >>> 8 & 255, e.pending_buf[e.d_buf + 2 * e.last_lit + 1] = 255 & t, e.pending_buf[e.l_buf + e.last_lit] = 255 & n, e.last_lit++, 0 === t ? e.dyn_ltree[2 * n]++ : (e.matches++, t--, e.dyn_ltree[2 * (g[n] + i + 1)]++, e.dyn_dtree[2 * E(t)]++), e.last_lit === e.lit_bufsize - 1;
					}, n._tr_align = function(e) {
						T(e, 2, 3), I(e, 256, f), function(e) {
							16 === e.bi_valid ? (k(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : 8 <= e.bi_valid && (e.pending_buf[e.pending++] = 255 & e.bi_buf, e.bi_buf >>= 8, e.bi_valid -= 8);
						}(e);
					};
				}, { "../utils/common": 41 }],
				53: [function(e, t, n) {
					"use strict";
					t.exports = function() {
						this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
					};
				}, {}],
				54: [function(e, t, n) {
					(function(e) {
						(function(e) {
							"use strict";
							if (!e.setImmediate) {
								var t, n, r, o, i = 1, a = {}, s = !1, l = e.document, c = Object.getPrototypeOf && Object.getPrototypeOf(e);
								c = c && c.setTimeout ? c : e, t = "[object process]" === {}.toString.call(e.process) ? function(e) {
									process.nextTick(function() {
										d(e);
									});
								} : function() {
									if (e.postMessage && !e.importScripts) {
										var t = !0, n = e.onmessage;
										return e.onmessage = function() {
											t = !1;
										}, e.postMessage("", "*"), e.onmessage = n, t;
									}
								}() ? (o = "setImmediate$" + Math.random() + "$", e.addEventListener ? e.addEventListener("message", p, !1) : e.attachEvent("onmessage", p), function(t) {
									e.postMessage(o + t, "*");
								}) : e.MessageChannel ? ((r = new MessageChannel()).port1.onmessage = function(e) {
									d(e.data);
								}, function(e) {
									r.port2.postMessage(e);
								}) : l && "onreadystatechange" in l.createElement("script") ? (n = l.documentElement, function(e) {
									var t = l.createElement("script");
									t.onreadystatechange = function() {
										d(e), t.onreadystatechange = null, n.removeChild(t), t = null;
									}, n.appendChild(t);
								}) : function(e) {
									setTimeout(d, 0, e);
								}, c.setImmediate = function(e) {
									"function" != typeof e && (e = new Function("" + e));
									for (var n = new Array(arguments.length - 1), r = 0; r < n.length; r++) n[r] = arguments[r + 1];
									return a[i] = {
										callback: e,
										args: n
									}, t(i), i++;
								}, c.clearImmediate = u;
							}
							function u(e) {
								delete a[e];
							}
							function d(e) {
								if (s) setTimeout(d, 0, e);
								else {
									var t = a[e];
									if (t) {
										s = !0;
										try {
											(function(e) {
												var t = e.callback, n = e.args;
												switch (n.length) {
													case 0:
														t();
														break;
													case 1:
														t(n[0]);
														break;
													case 2:
														t(n[0], n[1]);
														break;
													case 3:
														t(n[0], n[1], n[2]);
														break;
													default: t.apply(void 0, n);
												}
											})(t);
										} finally {
											u(e), s = !1;
										}
									}
								}
							}
							function p(t) {
								t.source === e && "string" == typeof t.data && 0 === t.data.indexOf(o) && d(+t.data.slice(o.length));
							}
						})("undefined" == typeof self ? void 0 === e ? this : e : self);
					}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
				}, {}]
			}, {}, [10])(10);
		});
	}), c = a((e) => {
		function t(e, t) {
			return void 0 === t && (t = Object), t && "function" == typeof t.getOwnPropertyDescriptors && (e = t.create(null, t.getOwnPropertyDescriptors(e))), t && "function" == typeof t.freeze ? t.freeze(e) : e;
		}
		function n(e, t) {
			return Object.prototype.hasOwnProperty.call(e, t);
		}
		var r = t({
			allowfullscreen: !0,
			async: !0,
			autofocus: !0,
			autoplay: !0,
			checked: !0,
			controls: !0,
			default: !0,
			defer: !0,
			disabled: !0,
			formnovalidate: !0,
			hidden: !0,
			ismap: !0,
			itemscope: !0,
			loop: !0,
			multiple: !0,
			muted: !0,
			nomodule: !0,
			novalidate: !0,
			open: !0,
			playsinline: !0,
			readonly: !0,
			required: !0,
			reversed: !0,
			selected: !0
		});
		var o = t({
			area: !0,
			base: !0,
			br: !0,
			col: !0,
			embed: !0,
			hr: !0,
			img: !0,
			input: !0,
			link: !0,
			meta: !0,
			param: !0,
			source: !0,
			track: !0,
			wbr: !0
		});
		var i = t({
			script: !1,
			style: !1,
			textarea: !0,
			title: !0
		});
		function a(e) {
			return e === s.HTML;
		}
		var s = t({
			HTML: "text/html",
			XML_APPLICATION: "application/xml",
			XML_TEXT: "text/xml",
			XML_XHTML_APPLICATION: "application/xhtml+xml",
			XML_SVG_IMAGE: "image/svg+xml"
		}), l = Object.keys(s).map(function(e) {
			return s[e];
		});
		var c = t({
			HTML: "http://www.w3.org/1999/xhtml",
			SVG: "http://www.w3.org/2000/svg",
			XML: "http://www.w3.org/XML/1998/namespace",
			XMLNS: "http://www.w3.org/2000/xmlns/"
		});
		e.assign = function(e, t) {
			if (null === e || "object" != typeof e) throw new TypeError("target is not an object");
			for (var r in t) n(t, r) && (e[r] = t[r]);
			return e;
		}, e.find = function(e, t, r) {
			if (void 0 === r && (r = Array.prototype), e && "function" == typeof r.find) return r.find.call(e, t);
			for (var o = 0; o < e.length; o++) if (n(e, o)) {
				var i = e[o];
				if (t.call(void 0, i, o, e)) return i;
			}
		}, e.freeze = t, e.HTML_BOOLEAN_ATTRIBUTES = r, e.HTML_RAW_TEXT_ELEMENTS = i, e.HTML_VOID_ELEMENTS = o, e.hasDefaultHTMLNamespace = function(e) {
			return a(e) || e === s.XML_XHTML_APPLICATION;
		}, e.hasOwn = n, e.isHTMLBooleanAttribute = function(e) {
			return n(r, e.toLowerCase());
		}, e.isHTMLRawTextElement = function(e) {
			var t = e.toLowerCase();
			return n(i, t) && !i[t];
		}, e.isHTMLEscapableRawTextElement = function(e) {
			var t = e.toLowerCase();
			return n(i, t) && i[t];
		}, e.isHTMLMimeType = a, e.isHTMLVoidElement = function(e) {
			return n(o, e.toLowerCase());
		}, e.isValidMimeType = function(e) {
			return l.indexOf(e) > -1;
		}, e.MIME_TYPE = s, e.NAMESPACE = c;
	}), u = a((e) => {
		function t(e, t) {
			e.prototype = Object.create(Error.prototype, {
				constructor: { value: e },
				name: {
					value: e.name,
					enumerable: !0,
					writable: t
				}
			});
		}
		var n = c().freeze({
			Error: "Error",
			IndexSizeError: "IndexSizeError",
			DomstringSizeError: "DomstringSizeError",
			HierarchyRequestError: "HierarchyRequestError",
			WrongDocumentError: "WrongDocumentError",
			InvalidCharacterError: "InvalidCharacterError",
			NoDataAllowedError: "NoDataAllowedError",
			NoModificationAllowedError: "NoModificationAllowedError",
			NotFoundError: "NotFoundError",
			NotSupportedError: "NotSupportedError",
			InUseAttributeError: "InUseAttributeError",
			InvalidStateError: "InvalidStateError",
			SyntaxError: "SyntaxError",
			InvalidModificationError: "InvalidModificationError",
			NamespaceError: "NamespaceError",
			InvalidAccessError: "InvalidAccessError",
			ValidationError: "ValidationError",
			TypeMismatchError: "TypeMismatchError",
			SecurityError: "SecurityError",
			NetworkError: "NetworkError",
			AbortError: "AbortError",
			URLMismatchError: "URLMismatchError",
			QuotaExceededError: "QuotaExceededError",
			TimeoutError: "TimeoutError",
			InvalidNodeTypeError: "InvalidNodeTypeError",
			DataCloneError: "DataCloneError",
			EncodingError: "EncodingError",
			NotReadableError: "NotReadableError",
			UnknownError: "UnknownError",
			ConstraintError: "ConstraintError",
			DataError: "DataError",
			TransactionInactiveError: "TransactionInactiveError",
			ReadOnlyError: "ReadOnlyError",
			VersionError: "VersionError",
			OperationError: "OperationError",
			NotAllowedError: "NotAllowedError",
			OptOutError: "OptOutError"
		}), r = Object.keys(n);
		function o(e) {
			return "number" == typeof e && e >= 1 && e <= 25;
		}
		function i(e, t) {
			o(e) ? (this.name = r[e], this.message = t || "") : (this.message = e, this.name = function(e) {
				return "string" == typeof e && e.substring(e.length - n.Error.length) === n.Error;
			}(t) ? t : n.Error), Error.captureStackTrace && Error.captureStackTrace(this, i);
		}
		t(i, !0), Object.defineProperties(i.prototype, { code: {
			enumerable: !0,
			get: function() {
				var e = r.indexOf(this.name);
				return o(e) ? e : 0;
			}
		} });
		for (var a = {
			INDEX_SIZE_ERR: 1,
			DOMSTRING_SIZE_ERR: 2,
			HIERARCHY_REQUEST_ERR: 3,
			WRONG_DOCUMENT_ERR: 4,
			INVALID_CHARACTER_ERR: 5,
			NO_DATA_ALLOWED_ERR: 6,
			NO_MODIFICATION_ALLOWED_ERR: 7,
			NOT_FOUND_ERR: 8,
			NOT_SUPPORTED_ERR: 9,
			INUSE_ATTRIBUTE_ERR: 10,
			INVALID_STATE_ERR: 11,
			SYNTAX_ERR: 12,
			INVALID_MODIFICATION_ERR: 13,
			NAMESPACE_ERR: 14,
			INVALID_ACCESS_ERR: 15,
			VALIDATION_ERR: 16,
			TYPE_MISMATCH_ERR: 17,
			SECURITY_ERR: 18,
			NETWORK_ERR: 19,
			ABORT_ERR: 20,
			URL_MISMATCH_ERR: 21,
			QUOTA_EXCEEDED_ERR: 22,
			TIMEOUT_ERR: 23,
			INVALID_NODE_TYPE_ERR: 24,
			DATA_CLONE_ERR: 25
		}, s = Object.entries(a), l = 0; l < s.length; l++) i[s[l][0]] = s[l][1];
		function u(e, t, n) {
			this.message = e, this.locator = t, this.cause = n, Error.captureStackTrace && Error.captureStackTrace(this, u);
		}
		t(u), e.DOMException = i, e.DOMExceptionName = n, e.ExceptionCode = a, e.ParseError = u;
	}), d = a((e) => {
		function t(e) {
			try {
				"function" != typeof e && (e = RegExp);
				var t = new e("𝌆", "u").exec("𝌆");
				return !!t && 2 === t[0].length;
			} catch (n) {}
			return !1;
		}
		var n = t();
		function r(e) {
			if ("[" !== e.source[0]) throw new Error(e + " can not be used with chars");
			return e.source.slice(1, e.source.lastIndexOf("]"));
		}
		function o(e, t) {
			if ("[" !== e.source[0]) throw new Error("/" + e.source + "/ can not be used with chars_without");
			if (!t || "string" != typeof t) throw new Error(JSON.stringify(t) + " is not a valid search");
			if (-1 === e.source.indexOf(t)) throw new Error("\"" + t + "\" is not is /" + e.source + "/");
			if ("-" === t && 1 !== e.source.indexOf(t)) throw new Error("\"" + t + "\" is not at the first postion of /" + e.source + "/");
			return new RegExp(e.source.replace(t, ""), n ? "u" : "");
		}
		function i(e) {
			var t = this;
			return new RegExp(Array.prototype.slice.call(arguments).map(function(e) {
				var n = "string" == typeof e;
				if (n && void 0 === t && "|" === e) throw new Error("use regg instead of reg to wrap expressions with `|`!");
				return n ? e : e.source;
			}).join(""), n ? "u" : "");
		}
		function a(e) {
			if (0 === arguments.length) throw new Error("no parameters provided");
			return i.apply(a, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
		}
		var s = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
		n && (s = i("[", r(s), "\\u{10000}-\\u{10FFFF}", "]"));
		var l = new RegExp("[^" + r(s) + "]", n ? "u" : ""), c = /[\x20\x09\x0D\x0A]/, u = r(c), d = i(c, "+"), p = i(c, "*"), f = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
		n && (f = i("[", r(f), "\\u{10000}-\\u{10FFFF}", "]"));
		var h = i("[", r(f), r(/[-.0-9\xB7]/), r(/[\u0300-\u036F\u203F-\u2040]/), "]"), m = i(f, h, "*"), g = i("^", m, "$"), w = i(h, "+"), b = a(i("&", m, ";"), "|", a(/&#[0-9]+;|&#x[0-9a-fA-F]+;/)), v = i("%", m, ";"), y = a(i("\"", a(/[^%&"]/, "|", v, "|", b), "*", "\""), "|", i("'", a(/[^%&']/, "|", v, "|", b), "*", "'")), x = a("\"", a(/[^<&"]/, "|", b), "*", "\"", "|", "'", a(/[^<&']/, "|", b), "*", "'"), S = i(o(f, ":"), o(h, ":"), "*"), N = i("^", S, "$"), E = i(S, a(":", S), "?"), k = i("^", E, "$"), T = i("(", E, ")"), I = a(/"[^"]*"|'[^']*'/), _ = i(/^<\?/, "(", m, ")", a(d, "(?!", c, ")(", s, "*?)"), "?", /\?>/), C = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/, A = a("\"", C, "*\"", "|", "'", o(C, "'"), "*'"), R = "<!--", $ = i(R, a(o(s, "-"), "|", i("-", o(s, "-"))), "*", "-->"), D = "#PCDATA", P = a("EMPTY", "|", "ANY", "|", a(i(/\(/, p, D, a(p, /\|/, p, E), "*", p, /\)\*/), "|", i(/\(/, p, D, p, /\)/)), "|", i(/\([^>]+\)/, /[?*+]?/)), M = i("<!ELEMENT", d, a(E, "|", v), d, a(P, "|", v), p, ">"), F = i("<!ATTLIST", d, m, a(d, m, d, a(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", a(i("NOTATION", d, /\(/, p, m, a(p, /\|/, p, m), "*", p, /\)/), "|", i(/\(/, p, w, a(p, /\|/, p, w), "*", p, /\)/))), d, a(/#REQUIRED|#IMPLIED/, "|", a(a("#FIXED", d), "?", x))), "*", p, ">"), O = "about:legacy-compat", L = a("\"" + O + "\"", "|", "'" + O + "'"), B = "SYSTEM", U = "PUBLIC", z = a(a(B, d, I), "|", a(U, d, A, d, I)), H = i("^", a(a(B, d, "(?<SystemLiteralOnly>", I, ")"), "|", a(U, d, "(?<PubidLiteral>", A, ")", d, "(?<SystemLiteral>", I, ")"))), j = i("^", A, "$"), q = i("^", I, "$"), W = a(y, "|", a(z, a(d, "NDATA", d, m), "?")), G = "<!ENTITY", V = a(i(G, d, m, d, W, p, ">"), "|", i(G, d, "%", d, m, d, a(y, "|", z), p, ">")), X = i("<!NOTATION", d, m, d, a(z, "|", i(U, d, A)), p, ">"), Z = i(p, "=", p), Y = /1[.]\d+/, Q = i(d, "version", Z, a("'", Y, "'", "|", "\"", Y, "\"")), K = /[A-Za-z][-A-Za-z0-9._]*/, J = i(/^<\?xml/, Q, a(d, "encoding", Z, a("\"", K, "\"", "|", "'", K, "'")), "?", a(d, "standalone", Z, a("'", a("yes", "|", "no"), "'", "|", "\"", a("yes", "|", "no"), "\"")), "?", p, /\?>/), ee = i(/<!\[CDATA\[/, i(s, "*?", /\]\]>/));
		e.chars = r, e.chars_without = o, e.detectUnicodeSupport = t, e.reg = i, e.regg = a, e.ABOUT_LEGACY_COMPAT = O, e.ABOUT_LEGACY_COMPAT_SystemLiteral = L, e.AttlistDecl = F, e.CDATA_START = "<![CDATA[", e.CDATA_END = "]]>", e.CDSect = ee, e.Char = s, e.Comment = $, e.COMMENT_START = R, e.COMMENT_END = "-->", e.DOCTYPE_DECL_START = "<!DOCTYPE", e.elementdecl = M, e.EntityDecl = V, e.EntityValue = y, e.ExternalID = z, e.ExternalID_match = H, e.Name = m, e.Name_exact = g, e.NCName_exact = N, e.NotationDecl = X, e.Reference = b, e.PEReference = v, e.PI = _, e.PUBLIC = U, e.PubidLiteral = A, e.PubidLiteral_match = j, e.QName = E, e.QName_exact = k, e.QName_group = T, e.S = d, e.SChar_s = u, e.S_OPT = p, e.SYSTEM = B, e.SystemLiteral = I, e.SystemLiteral_match = q, e.InvalidChar = l, e.UNICODE_REPLACEMENT_CHARACTER = "�", e.UNICODE_SUPPORT = n, e.XMLDecl = J;
	}), p = a((e) => {
		var t = c(), n = t.find, r = t.hasDefaultHTMLNamespace, o = t.hasOwn, i = t.isHTMLMimeType, a = t.isHTMLRawTextElement, s = t.isHTMLVoidElement, l = t.MIME_TYPE, p = t.NAMESPACE, f = Symbol(), h = u(), m = h.DOMException, g = h.DOMExceptionName, w = d();
		function b(e) {
			if (e !== f) throw new TypeError("Illegal constructor");
		}
		function v(e) {
			return "" !== e;
		}
		function y(e, t) {
			return o(e, t) || (e[t] = !0), e;
		}
		function x(e) {
			if (!e) return [];
			var t = function(e) {
				return e ? e.split(/[\t\n\f\r ]+/).filter(v) : [];
			}(e);
			return Object.keys(t.reduce(y, {}));
		}
		function S(e) {
			if (!w.QName_exact.test(e)) throw new m(m.INVALID_CHARACTER_ERR, "invalid character in qualified name \"" + e + "\"");
		}
		function N(e, n) {
			S(n), e = e || null;
			var r = null, o = n;
			if (n.indexOf(":") >= 0) {
				var i = n.split(":");
				r = i[0], o = i[1];
			}
			if (null !== r && null === e) throw new m(m.NAMESPACE_ERR, "prefix is non-null and namespace is null");
			if ("xml" === r && e !== t.NAMESPACE.XML) throw new m(m.NAMESPACE_ERR, "prefix is \"xml\" and namespace is not the XML namespace");
			if (("xmlns" === r || "xmlns" === n) && e !== t.NAMESPACE.XMLNS) throw new m(m.NAMESPACE_ERR, "either qualifiedName or prefix is \"xmlns\" and namespace is not the XMLNS namespace");
			if (e === t.NAMESPACE.XMLNS && "xmlns" !== r && "xmlns" !== n) throw new m(m.NAMESPACE_ERR, "namespace is the XMLNS namespace and neither qualifiedName nor prefix is \"xmlns\"");
			return [
				e,
				r,
				o
			];
		}
		function E(e, t) {
			for (var n in e) o(e, n) && (t[n] = e[n]);
		}
		function k(e, t) {
			var n = e.prototype;
			if (!(n instanceof t)) {
				function r() {}
				r.prototype = t.prototype, E(n, r = new r()), e.prototype = n = r;
			}
			n.constructor != e && ("function" != typeof e && console.error("unknown Class:" + e), n.constructor = e);
		}
		var T = {}, I = T.ELEMENT_NODE = 1, _ = T.ATTRIBUTE_NODE = 2, C = T.TEXT_NODE = 3, A = T.CDATA_SECTION_NODE = 4, R = T.ENTITY_REFERENCE_NODE = 5, $ = T.ENTITY_NODE = 6, D = T.PROCESSING_INSTRUCTION_NODE = 7, P = T.COMMENT_NODE = 8, M = T.DOCUMENT_NODE = 9, F = T.DOCUMENT_TYPE_NODE = 10, O = T.DOCUMENT_FRAGMENT_NODE = 11, L = T.NOTATION_NODE = 12, B = t.freeze({
			DOCUMENT_POSITION_DISCONNECTED: 1,
			DOCUMENT_POSITION_PRECEDING: 2,
			DOCUMENT_POSITION_FOLLOWING: 4,
			DOCUMENT_POSITION_CONTAINS: 8,
			DOCUMENT_POSITION_CONTAINED_BY: 16,
			DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
		});
		function U(e, t) {
			if (t.length < e.length) return U(t, e);
			var n = null;
			for (var r in e) {
				if (e[r] !== t[r]) return n;
				n = e[r];
			}
			return n;
		}
		function z(e) {
			return e.guid || (e.guid = Math.random()), e.guid;
		}
		function H() {}
		function j(e, t) {
			this._node = e, this._refresh = t, q(this);
		}
		function q(e) {
			var t = e._node._inc || e._node.ownerDocument._inc;
			if (e._inc !== t) {
				var n = e._refresh(e._node);
				if ($e(e, "length", n.length), !e.$$length || n.length < e.$$length) for (var r = n.length; r in e; r++) o(e, r) && delete e[r];
				E(n, e), e._inc = t;
			}
		}
		function W() {
			this._nsIndex = Object.create(null), this._noNsIndex = Object.create(null);
		}
		function G(e, t) {
			for (var n = 0; n < e.length;) {
				if (e[n] === t) return n;
				n++;
			}
		}
		function V(e, t, n) {
			if (!t) return e._noNsIndex;
			var r = e._nsIndex[t];
			return !r && n && (r = e._nsIndex[t] = Object.create(null)), r;
		}
		function X(e, t, n, r) {
			if (r ? t[G(t, r)] = n : (t[t.length] = n, t.length++), function(e, t) {
				V(e, t.namespaceURI, !0)[t.localName] = t;
			}(t, n), e) {
				n.ownerElement = e;
				var o = e.ownerDocument;
				o && (r && ne(o, e, r), function(e, t, n) {
					e && e._inc++, n.namespaceURI === p.XMLNS && (t._nsMap[n.prefix ? n.localName : ""] = n.value);
				}(o, e, n));
			}
		}
		function Z(e, t, n) {
			var r = G(t, n);
			if (r >= 0) {
				for (var o = t.length - 1; r <= o;) t[r] = t[++r];
				if (t.length = o, function(e, t) {
					var n = V(e, t.namespaceURI, !1);
					n && delete n[t.localName];
				}(t, n), e) {
					var i = e.ownerDocument;
					i && ne(i, e, n), n.ownerElement = null;
				}
			}
		}
		function Y() {}
		function Q(e) {
			b(e);
		}
		function K(e) {
			return ("<" == e ? "&lt;" : ">" == e && "&gt;") || "&" == e && "&amp;" || "\"" == e && "&quot;" || "&#" + e.charCodeAt() + ";";
		}
		function J(e, t) {
			ee(e, null, { enter: function(e) {
				return !t(e) || ee.STOP;
			} });
		}
		function ee(e, t, n) {
			for (var r = [{
				node: e,
				context: t,
				phase: ee.ENTER
			}]; r.length > 0;) {
				var o = r.pop();
				if (o.phase === ee.ENTER) {
					var i = n.enter(o.node, o.context);
					if (i === ee.STOP) return ee.STOP;
					if (r.push({
						node: o.node,
						context: i,
						phase: ee.EXIT
					}), null == i) continue;
					for (var a = o.node.lastChild; a;) r.push({
						node: a,
						context: i,
						phase: ee.ENTER
					}), a = a.previousSibling;
				} else n.exit && n.exit(o.node, o.context);
			}
		}
		function te(e, t) {
			b(e);
			var n = t || {};
			this.ownerDocument = this, this.contentType = n.contentType || l.XML_APPLICATION, this.type = i(this.contentType) ? "html" : "xml";
		}
		function ne(e, t, n, r) {
			e && e._inc++, n.namespaceURI === p.XMLNS && delete t._nsMap[n.prefix ? n.localName : ""];
		}
		function re(e, t, n) {
			if (e && e._inc) {
				e._inc++;
				var r = t.childNodes;
				if (n && !n.nextSibling) r[r.length++] = n;
				else {
					for (var o = t.firstChild, i = 0; o;) r[i++] = o, o = o.nextSibling;
					r.length = i, delete r[r.length];
				}
			}
		}
		function oe(e, t) {
			if (e !== t.parentNode) throw new m(m.NOT_FOUND_ERR, "child's parent is not parent");
			var n = t.previousSibling, r = t.nextSibling;
			return n ? n.nextSibling = r : e.firstChild = r, r ? r.previousSibling = n : e.lastChild = n, re(e.ownerDocument, e), t.parentNode = null, t.previousSibling = null, t.nextSibling = null, t;
		}
		function ie(e) {
			return e && e.nodeType === Q.DOCUMENT_TYPE_NODE;
		}
		function ae(e) {
			return e && e.nodeType === Q.ELEMENT_NODE;
		}
		function se(e) {
			return e && e.nodeType === Q.TEXT_NODE;
		}
		function le(e, t) {
			var r = e.childNodes || [];
			if (n(r, ae) || ie(t)) return !1;
			var o = n(r, ie);
			return !(t && o && r.indexOf(o) > r.indexOf(t));
		}
		function ce(e, t) {
			var r = e.childNodes || [];
			if (n(r, function(e) {
				return ae(e) && e !== t;
			})) return !1;
			var o = n(r, ie);
			return !(t && o && r.indexOf(o) > r.indexOf(t));
		}
		function ue(e, t, n) {
			if (!function(e) {
				return e && (e.nodeType === Q.DOCUMENT_NODE || e.nodeType === Q.DOCUMENT_FRAGMENT_NODE || e.nodeType === Q.ELEMENT_NODE);
			}(e)) throw new m(m.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + e.nodeType);
			if (n && n.parentNode !== e) throw new m(m.NOT_FOUND_ERR, "child not in parent");
			if (!function(e) {
				return e && (e.nodeType === Q.CDATA_SECTION_NODE || e.nodeType === Q.COMMENT_NODE || e.nodeType === Q.DOCUMENT_FRAGMENT_NODE || e.nodeType === Q.DOCUMENT_TYPE_NODE || e.nodeType === Q.ELEMENT_NODE || e.nodeType === Q.PROCESSING_INSTRUCTION_NODE || e.nodeType === Q.TEXT_NODE);
			}(t) || ie(t) && e.nodeType !== Q.DOCUMENT_NODE) throw new m(m.HIERARCHY_REQUEST_ERR, "Unexpected node type " + t.nodeType + " for parent node type " + e.nodeType);
		}
		function de(e, t, r) {
			var o = e.childNodes || [], i = t.childNodes || [];
			if (t.nodeType === Q.DOCUMENT_FRAGMENT_NODE) {
				var a = i.filter(ae);
				if (a.length > 1 || n(i, se)) throw new m(m.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
				if (1 === a.length && !le(e, r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
			}
			if (ae(t) && !le(e, r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
			if (ie(t)) {
				if (n(o, ie)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
				var s = n(o, ae);
				if (r && o.indexOf(s) < o.indexOf(r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
				if (!r && s) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
			}
		}
		function pe(e, t, r) {
			var o = e.childNodes || [], i = t.childNodes || [];
			if (t.nodeType === Q.DOCUMENT_FRAGMENT_NODE) {
				var a = i.filter(ae);
				if (a.length > 1 || n(i, se)) throw new m(m.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
				if (1 === a.length && !ce(e, r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
			}
			if (ae(t) && !ce(e, r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
			if (ie(t)) {
				if (n(o, function(e) {
					return ie(e) && e !== r;
				})) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
				var s = n(o, ae);
				if (r && o.indexOf(s) < o.indexOf(r)) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
			}
		}
		function fe(e, t, n, r) {
			ue(e, t, n), e.nodeType === Q.DOCUMENT_NODE && (r || de)(e, t, n);
			var o = t.parentNode;
			if (o && o.removeChild(t), t.nodeType === O) {
				var i = t.firstChild;
				if (null == i) return t;
				var a = t.lastChild;
			} else i = a = t;
			var s = n ? n.previousSibling : e.lastChild;
			i.previousSibling = s, a.nextSibling = n, s ? s.nextSibling = i : e.firstChild = i, null == n ? e.lastChild = a : n.previousSibling = a;
			do
				i.parentNode = e;
			while (i !== a && (i = i.nextSibling));
			return re(e.ownerDocument || e, e, t), t.nodeType == O && (t.firstChild = t.lastChild = null), t;
		}
		function he(e) {
			b(e), this._nsMap = Object.create(null);
		}
		function me(e) {
			b(e), this.namespaceURI = null, this.prefix = null, this.ownerElement = null;
		}
		function ge(e) {
			b(e);
		}
		function we(e) {
			b(e);
		}
		function be(e) {
			b(e);
		}
		function ve(e) {
			b(e);
		}
		function ye(e) {
			b(e);
		}
		function xe(e) {
			b(e);
		}
		function Se(e) {
			b(e);
		}
		function Ne(e) {
			b(e);
		}
		function Ee(e) {
			b(e);
		}
		function ke(e) {
			b(e);
		}
		function Te() {}
		function Ie(e) {
			var t = "function" == typeof e ? {
				requireWellFormed: !1,
				splitCDATASections: !0,
				nodeFilter: e
			} : null != e ? {
				requireWellFormed: !!e.requireWellFormed,
				splitCDATASections: !1 !== e.splitCDATASections,
				nodeFilter: e.nodeFilter || null
			} : {
				requireWellFormed: !1,
				splitCDATASections: !0,
				nodeFilter: null
			};
			var n = [], r = this.nodeType === M && this.documentElement || this, o = r.prefix, i = r.namespaceURI;
			if (i && null == o && null == (o = r.lookupPrefix(i))) var a = [{
				namespace: i,
				prefix: null
			}];
			return Ae(this, n, a, t), n.join("");
		}
		function _e(e, t, n) {
			var r = e.prefix || "", o = e.namespaceURI;
			if (!o) return !1;
			if ("xml" === r && o === p.XML || o === p.XMLNS) return !1;
			for (var i = n.length; i--;) {
				var a = n[i];
				if (a.prefix === r) return a.namespace !== o;
			}
			return !0;
		}
		function Ce(e, t, n, r) {
			if (r && !w.QName_exact.test(t)) throw new m("The attribute name \"" + t + "\" is not a valid XML QName", g.InvalidStateError);
			e.push(" ", t, "=\"", n.replace(/[<>&"\t\n\r]/g, K), "\"");
		}
		function Ae(e, t, n, r) {
			n || (n = []);
			var o = r.nodeFilter, i = r.requireWellFormed, l = r.splitCDATASections, c = "html" === (e.nodeType === M ? e : e.ownerDocument).type;
			ee(e, { ns: n }, {
				enter: function(e, n) {
					var u = n.ns;
					if (o) {
						if (!(e = o(e))) return null;
						if ("string" == typeof e) return t.push(e), null;
					}
					switch (e.nodeType) {
						case I:
							var d = e.attributes, f = d.length, h = e.tagName, b = h;
							if (!c && !e.prefix && e.namespaceURI) {
								for (var v, y = 0; y < d.length; y++) if ("xmlns" === d.item(y).name) {
									v = d.item(y).value;
									break;
								}
								if (!v) {
									for (var x = u.length - 1; x >= 0; x--) if ("" === (S = u[x]).prefix && S.namespace === e.namespaceURI) {
										v = S.namespace;
										break;
									}
								}
								if (v !== e.namespaceURI) for (x = u.length - 1; x >= 0; x--) {
									var S;
									if ((S = u[x]).namespace === e.namespaceURI) {
										S.prefix && (b = S.prefix + ":" + h);
										break;
									}
								}
							}
							if (i && !w.QName_exact.test(b)) throw new m("The element name \"" + b + "\" is not a valid XML QName", g.InvalidStateError);
							t.push("<", b);
							for (var N = u.slice(), E = 0; E < f; E++) "xmlns" == (k = d.item(E)).prefix ? N.push({
								prefix: k.localName,
								namespace: k.value
							}) : "xmlns" == k.nodeName && N.push({
								prefix: "",
								namespace: k.value
							});
							for (E = 0; E < f; E++) {
								var k;
								if (_e(k = d.item(E), 0, N)) {
									var T = k.prefix || "", $ = k.namespaceURI;
									Ce(t, T ? "xmlns:" + T : "xmlns", $, i), N.push({
										prefix: T,
										namespace: $
									});
								}
								var L = o ? o(k) : k;
								L && ("string" == typeof L ? t.push(L) : Ce(t, L.name, L.value, i));
							}
							if (h === b && _e(e, 0, N)) {
								var B = e.prefix || "";
								$ = e.namespaceURI;
								Ce(t, B ? "xmlns:" + B : "xmlns", $, i), N.push({
									prefix: B,
									namespace: $
								});
							}
							var U = !e.firstChild;
							if (U && (c || e.namespaceURI === p.HTML) && (U = s(h)), U) return t.push("/>"), null;
							if (t.push(">"), c && a(h)) {
								for (var z = e.firstChild; z;) z.data ? t.push(z.data) : Ae(z, t, N.slice(), r), z = z.nextSibling;
								return t.push("</", b, ">"), null;
							}
							return {
								ns: N,
								tag: b
							};
						case M:
						case O:
							if (i && e.nodeType === M && null == e.documentElement) throw new m("The Document has no documentElement", g.InvalidStateError);
							return { ns: u };
						case _: return Ce(t, e.name, e.value, i), null;
						case C:
							if (i && w.InvalidChar.test(e.data)) throw new m("The Text node data contains characters outside the XML Char production", g.InvalidStateError);
							return t.push(e.data.replace(/[<&>]/g, K)), null;
						case A:
							if (i && -1 !== e.data.indexOf("]]>")) throw new m("The CDATASection data contains \"]]>\"", g.InvalidStateError);
							return l ? t.push(w.CDATA_START, e.data.replace(/]]>/g, "]]]]><![CDATA[>"), w.CDATA_END) : t.push(w.CDATA_START, e.data, w.CDATA_END), null;
						case P:
							if (i) {
								if (w.InvalidChar.test(e.data)) throw new m("The comment node data contains characters outside the XML Char production", g.InvalidStateError);
								if (-1 !== e.data.indexOf("--") || "-" === e.data[e.data.length - 1]) throw new m("The comment node data contains \"--\" or ends with \"-\"", g.InvalidStateError);
							}
							return t.push(w.COMMENT_START, e.data, w.COMMENT_END), null;
						case F:
							var H = e.publicId, j = e.systemId;
							if (i) {
								if (!w.Name_exact.test(e.name)) throw new m("The doctype name \"" + e.name + "\" is not a valid XML Name", g.InvalidStateError);
								if (H && !w.PubidLiteral_match.test(H)) throw new m("DocumentType publicId is not a valid PubidLiteral", g.InvalidStateError);
								if (j && "." !== j && !w.SystemLiteral_match.test(j)) throw new m("DocumentType systemId is not a valid SystemLiteral", g.InvalidStateError);
								if (e.internalSubset && -1 !== e.internalSubset.indexOf("]>")) throw new m("DocumentType internalSubset contains \"]>\"", g.InvalidStateError);
							}
							return t.push(w.DOCTYPE_DECL_START, " ", e.name), H ? (t.push(" ", w.PUBLIC, " ", H), j && "." !== j && t.push(" ", j)) : j && "." !== j && t.push(" ", w.SYSTEM, " ", j), e.internalSubset && t.push(" [", e.internalSubset, "]"), t.push(">"), null;
						case D:
							if (i) {
								if (!w.NCName_exact.test(e.target) || "xml" === e.target.toLowerCase()) throw new m("The processing instruction target \"" + e.target + "\" is not a valid XML NCName or is reserved", g.InvalidStateError);
								if (w.InvalidChar.test(e.data)) throw new m("The ProcessingInstruction data contains characters outside the XML Char production", g.InvalidStateError);
								if (-1 !== e.data.indexOf("?>")) throw new m("The ProcessingInstruction data contains \"?>\"", g.InvalidStateError);
							}
							return t.push("<?", e.target, " ", e.data, "?>"), null;
						case R:
							if (i && !w.Name_exact.test(e.nodeName)) throw new m("The entity reference name \"" + e.nodeName + "\" is not a valid XML Name", g.InvalidStateError);
							return t.push("&", e.nodeName, ";"), null;
						default: return t.push("??", e.nodeName), null;
					}
				},
				exit: function(e, n) {
					n && n.tag && t.push("</", n.tag, ">");
				}
			});
		}
		function Re(e, t, n) {
			var r;
			return ee(t, null, { enter: function(t, i) {
				var a = new t.constructor(f);
				for (var s in t) if (o(t, s)) {
					var l = t[s];
					"object" != typeof l && l != a[s] && (a[s] = l);
				}
				t.childNodes && (a.childNodes = new H()), a.ownerDocument = e;
				var c = n;
				switch (a.nodeType) {
					case I:
						var u = t.attributes, d = a.attributes = new W(), p = u.length;
						d._ownerElement = a;
						for (var h = 0; h < p; h++) a.setAttributeNode(Re(e, u.item(h), !0));
						break;
					case _: c = !0;
				}
				return null !== i ? i.appendChild(a) : r = a, c ? a : null;
			} }), r;
		}
		function $e(e, t, n) {
			e[t] = n;
		}
		function De(e) {
			for (var t = [], n = e.firstChild; n;) n.nodeType === I && t.push(n), n = n.nextSibling;
			return t;
		}
		H.prototype = {
			length: 0,
			item: function(e) {
				return e >= 0 && e < this.length ? this[e] : null;
			},
			toString: function(e) {
				var t = "function" == typeof e ? {
					requireWellFormed: !1,
					splitCDATASections: !0,
					nodeFilter: e
				} : e ? {
					requireWellFormed: !!e.requireWellFormed,
					splitCDATASections: !1 !== e.splitCDATASections,
					nodeFilter: e.nodeFilter || null
				} : {
					requireWellFormed: !1,
					splitCDATASections: !0,
					nodeFilter: null
				};
				for (var n = [], r = 0; r < this.length; r++) Ae(this[r], n, null, t);
				return n.join("");
			},
			filter: function(e) {
				return Array.prototype.filter.call(this, e);
			},
			indexOf: function(e) {
				return Array.prototype.indexOf.call(this, e);
			}
		}, H.prototype[Symbol.iterator] = function() {
			var e = this, t = 0;
			return {
				next: function() {
					return t < e.length ? {
						value: e[t++],
						done: !1
					} : { done: !0 };
				},
				return: function() {
					return { done: !0 };
				}
			};
		}, j.prototype.item = function(e) {
			return q(this), this[e] || null;
		}, k(j, H), W.prototype = {
			length: 0,
			item: H.prototype.item,
			getNamedItem: function(e) {
				this._ownerElement && this._ownerElement._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase());
				for (var t = 0; t < this.length;) {
					var n = this[t];
					if (n.nodeName === e) return n;
					t++;
				}
				return null;
			},
			setNamedItem: function(e) {
				var t = e.ownerElement;
				if (t && t !== this._ownerElement) throw new m(m.INUSE_ATTRIBUTE_ERR);
				var n, r, o, i, a = (n = this, r = e.namespaceURI, o = e.localName, (i = V(n, r, !1)) && i[o] || null);
				return a === e ? e : (X(this._ownerElement, this, e, a), a);
			},
			setNamedItemNS: function(e) {
				return this.setNamedItem(e);
			},
			removeNamedItem: function(e) {
				var t = this.getNamedItem(e);
				if (!t) throw new m(m.NOT_FOUND_ERR, e);
				return Z(this._ownerElement, this, t), t;
			},
			removeNamedItemNS: function(e, t) {
				var n = this.getNamedItemNS(e, t);
				if (!n) throw new m(m.NOT_FOUND_ERR, e ? e + " : " + t : t);
				return Z(this._ownerElement, this, n), n;
			},
			getNamedItemNS: function(e, t) {
				e || (e = null);
				for (var n = 0; n < this.length;) {
					var r = this[n];
					if (r.localName === t && r.namespaceURI === e) return r;
					n++;
				}
				return null;
			}
		}, W.prototype[Symbol.iterator] = function() {
			var e = this, t = 0;
			return {
				next: function() {
					return t < e.length ? {
						value: e[t++],
						done: !1
					} : { done: !0 };
				},
				return: function() {
					return { done: !0 };
				}
			};
		}, Y.prototype = {
			hasFeature: function(e, t) {
				return !0;
			},
			createDocument: function(e, t, n) {
				var r = l.XML_APPLICATION;
				e === p.HTML ? r = l.XML_XHTML_APPLICATION : e === p.SVG && (r = l.XML_SVG_IMAGE);
				var o = new te(f, { contentType: r });
				if (o.implementation = this, o.childNodes = new H(), o.doctype = n || null, n && o.appendChild(n), t) {
					var i = o.createElementNS(e, t);
					o.appendChild(i);
				}
				return o;
			},
			createDocumentType: function(e, t, n, r) {
				S(e);
				var o = new ye(f);
				return o.name = e, o.nodeName = e, o.publicId = t || "", o.systemId = n || "", o.internalSubset = r || "", o.childNodes = new H(), o;
			},
			createHTMLDocument: function(e) {
				var t = new te(f, { contentType: l.HTML });
				if (t.implementation = this, t.childNodes = new H(), !1 !== e) {
					t.doctype = this.createDocumentType("html"), t.doctype.ownerDocument = t, t.appendChild(t.doctype);
					var n = t.createElement("html");
					t.appendChild(n);
					var r = t.createElement("head");
					if (n.appendChild(r), "string" == typeof e) {
						var o = t.createElement("title");
						o.appendChild(t.createTextNode(e)), r.appendChild(o);
					}
					n.appendChild(t.createElement("body"));
				}
				return t;
			}
		}, Q.prototype = {
			firstChild: null,
			lastChild: null,
			previousSibling: null,
			nextSibling: null,
			parentNode: null,
			get parentElement() {
				return this.parentNode && this.parentNode.nodeType === this.ELEMENT_NODE ? this.parentNode : null;
			},
			childNodes: null,
			ownerDocument: null,
			nodeValue: null,
			namespaceURI: null,
			prefix: null,
			localName: null,
			baseURI: "about:blank",
			get isConnected() {
				var e = this.getRootNode();
				return e && e.nodeType === e.DOCUMENT_NODE;
			},
			contains: function(e) {
				if (!e) return !1;
				var t = e;
				do {
					if (this === t) return !0;
					t = t.parentNode;
				} while (t);
				return !1;
			},
			getRootNode: function(e) {
				var t = this;
				do {
					if (!t.parentNode) return t;
					t = t.parentNode;
				} while (t);
			},
			isEqualNode: function(e) {
				if (!e) return !1;
				for (var t = [{
					node: this,
					other: e
				}]; t.length > 0;) {
					var n = t.pop(), r = n.node, o = n.other;
					if (r.nodeType !== o.nodeType) return !1;
					switch (r.nodeType) {
						case r.DOCUMENT_TYPE_NODE:
							if (r.name !== o.name) return !1;
							if (r.publicId !== o.publicId) return !1;
							if (r.systemId !== o.systemId) return !1;
							break;
						case r.ELEMENT_NODE:
							if (r.namespaceURI !== o.namespaceURI) return !1;
							if (r.prefix !== o.prefix) return !1;
							if (r.localName !== o.localName) return !1;
							if (r.attributes.length !== o.attributes.length) return !1;
							for (var i = 0; i < r.attributes.length; i++) {
								var a = r.attributes.item(i), s = o.getAttributeNodeNS(a.namespaceURI, a.localName);
								if (!s) return !1;
								t.push({
									node: a,
									other: s
								});
							}
							break;
						case r.ATTRIBUTE_NODE:
							if (r.namespaceURI !== o.namespaceURI) return !1;
							if (r.localName !== o.localName) return !1;
							if (r.value !== o.value) return !1;
							break;
						case r.PROCESSING_INSTRUCTION_NODE:
							if (r.target !== o.target || r.data !== o.data) return !1;
							break;
						case r.TEXT_NODE:
						case r.CDATA_SECTION_NODE:
						case r.COMMENT_NODE: if (r.data !== o.data) return !1;
					}
					if (r.childNodes.length !== o.childNodes.length) return !1;
					for (i = r.childNodes.length - 1; i >= 0; i--) t.push({
						node: r.childNodes[i],
						other: o.childNodes[i]
					});
				}
				return !0;
			},
			isSameNode: function(e) {
				return this === e;
			},
			insertBefore: function(e, t) {
				return fe(this, e, t);
			},
			replaceChild: function(e, t) {
				fe(this, e, t, pe), t && this.removeChild(t);
			},
			removeChild: function(e) {
				return oe(this, e);
			},
			appendChild: function(e) {
				return this.insertBefore(e, null);
			},
			hasChildNodes: function() {
				return null != this.firstChild;
			},
			cloneNode: function(e) {
				return Re(this.ownerDocument || this, this, e);
			},
			normalize: function() {
				ee(this, null, { enter: function(e) {
					for (var t = e.firstChild; t;) {
						var n = t.nextSibling;
						if (null !== n && n.nodeType === C && t.nodeType === C) {
							for (var r = [], o = n; null !== o && o.nodeType === C;) r.push(o.data), o = o.nextSibling;
							for (var i = t.nextSibling; i !== o;) {
								var a = i.nextSibling;
								i.parentNode = null, i.previousSibling = null, i.nextSibling = null, i = a;
							}
							t.nextSibling = o, null !== o ? o.previousSibling = t : e.lastChild = t, t.appendData(r.join("")), re(e.ownerDocument, e), t = o;
						} else t = n;
					}
					return !0;
				} });
			},
			isSupported: function(e, t) {
				return this.ownerDocument.implementation.hasFeature(e, t);
			},
			lookupPrefix: function(e) {
				for (var t = this; t;) {
					var n = t._nsMap;
					if (n) {
						for (var r in n) if (o(n, r) && n[r] === e) return r;
					}
					t = t.nodeType == _ ? t.ownerDocument : t.parentNode;
				}
				return null;
			},
			lookupNamespaceURI: function(e) {
				for (var t = this; t;) {
					var n = t._nsMap;
					if (n && o(n, e)) return n[e];
					t = t.nodeType == _ ? t.ownerDocument : t.parentNode;
				}
				return null;
			},
			isDefaultNamespace: function(e) {
				return null == this.lookupPrefix(e);
			},
			compareDocumentPosition: function(e) {
				if (this === e) return 0;
				var t = e, n = this, r = null, o = null;
				if (t instanceof me && (t = (r = t).ownerElement), n instanceof me && (n = (o = n).ownerElement, r && t && n === t)) for (var i, a = 0; i = n.attributes[a]; a++) {
					if (i === r) return B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + B.DOCUMENT_POSITION_PRECEDING;
					if (i === o) return B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + B.DOCUMENT_POSITION_FOLLOWING;
				}
				if (!t || !n || n.ownerDocument !== t.ownerDocument) return B.DOCUMENT_POSITION_DISCONNECTED + B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (z(n.ownerDocument) > z(t.ownerDocument) ? B.DOCUMENT_POSITION_FOLLOWING : B.DOCUMENT_POSITION_PRECEDING);
				if (o && t === n) return B.DOCUMENT_POSITION_CONTAINS + B.DOCUMENT_POSITION_PRECEDING;
				if (r && t === n) return B.DOCUMENT_POSITION_CONTAINED_BY + B.DOCUMENT_POSITION_FOLLOWING;
				for (var s = [], l = t.parentNode; l;) {
					if (!o && l === n) return B.DOCUMENT_POSITION_CONTAINED_BY + B.DOCUMENT_POSITION_FOLLOWING;
					s.push(l), l = l.parentNode;
				}
				s.reverse();
				for (var c = [], u = n.parentNode; u;) {
					if (!r && u === t) return B.DOCUMENT_POSITION_CONTAINS + B.DOCUMENT_POSITION_PRECEDING;
					c.push(u), u = u.parentNode;
				}
				c.reverse();
				var d = U(s, c);
				for (var p in d.childNodes) {
					var f = d.childNodes[p];
					if (f === n) return B.DOCUMENT_POSITION_FOLLOWING;
					if (f === t) return B.DOCUMENT_POSITION_PRECEDING;
					if (c.indexOf(f) >= 0) return B.DOCUMENT_POSITION_FOLLOWING;
					if (s.indexOf(f) >= 0) return B.DOCUMENT_POSITION_PRECEDING;
				}
				return 0;
			}
		}, E(T, Q), E(T, Q.prototype), E(B, Q), E(B, Q.prototype), ee.STOP = Symbol("walkDOM.STOP"), ee.ENTER = 0, ee.EXIT = 1, te.prototype = {
			implementation: null,
			nodeName: "#document",
			nodeType: M,
			doctype: null,
			documentElement: null,
			_inc: 1,
			insertBefore: function(e, t) {
				if (e.nodeType === O) {
					for (var n = e.firstChild; n;) {
						var r = n.nextSibling;
						this.insertBefore(n, t), n = r;
					}
					return e;
				}
				return fe(this, e, t), e.ownerDocument = this, null === this.documentElement && e.nodeType === I && (this.documentElement = e), e;
			},
			removeChild: function(e) {
				var t = oe(this, e);
				return t === this.documentElement && (this.documentElement = null), t;
			},
			replaceChild: function(e, t) {
				fe(this, e, t, pe), e.ownerDocument = this, t && this.removeChild(t), ae(e) && (this.documentElement = e);
			},
			importNode: function(e, t) {
				return function(e, t, n) {
					var r;
					return ee(t, null, { enter: function(t, o) {
						var i = t.cloneNode(!1);
						return i.ownerDocument = e, i.parentNode = null, null === o ? r = i : o.appendChild(i), t.nodeType === _ || n ? i : null;
					} }), r;
				}(this, e, t);
			},
			getElementById: function(e) {
				var t = null;
				return J(this.documentElement, function(n) {
					if (n.nodeType == I && n.getAttribute("id") == e) return t = n, !0;
				}), t;
			},
			createElement: function(e) {
				var t = new he(f);
				return t.ownerDocument = this, "html" === this.type && (e = e.toLowerCase()), r(this.contentType) && (t.namespaceURI = p.HTML), t.nodeName = e, t.tagName = e, t.localName = e, t.childNodes = new H(), (t.attributes = new W())._ownerElement = t, t;
			},
			createDocumentFragment: function() {
				var e = new Ee(f);
				return e.ownerDocument = this, e.childNodes = new H(), e;
			},
			createTextNode: function(e) {
				var t = new we(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.appendData(e), t;
			},
			createComment: function(e) {
				var t = new be(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.appendData(e), t;
			},
			createCDATASection: function(e) {
				if (-1 !== e.indexOf("]]>")) throw new m(m.INVALID_CHARACTER_ERR, "data contains \"]]>\"");
				var t = new ve(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.appendData(e), t;
			},
			createProcessingInstruction: function(e, t) {
				var n = new ke(f);
				return n.ownerDocument = this, n.childNodes = new H(), n.nodeName = n.target = e, n.nodeValue = n.data = t, n;
			},
			createAttribute: function(e) {
				if (!w.QName_exact.test(e)) throw new m(m.INVALID_CHARACTER_ERR, "invalid character in name \"" + e + "\"");
				return "html" === this.type && (e = e.toLowerCase()), this._createAttribute(e);
			},
			_createAttribute: function(e) {
				var t = new me(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.name = e, t.nodeName = e, t.localName = e, t.specified = !0, t;
			},
			createEntityReference: function(e) {
				if (!w.Name_exact.test(e)) throw new m(m.INVALID_CHARACTER_ERR, "not a valid xml name \"" + e + "\"");
				if ("html" === this.type) throw new m("document is an html document", g.NotSupportedError);
				var t = new Ne(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.nodeName = e, t;
			},
			createElementNS: function(e, t) {
				var n = N(e, t), r = new he(f), o = r.attributes = new W();
				return r.childNodes = new H(), r.ownerDocument = this, r.nodeName = t, r.tagName = t, r.namespaceURI = n[0], r.prefix = n[1], r.localName = n[2], o._ownerElement = r, r;
			},
			createAttributeNS: function(e, t) {
				var n = N(e, t), r = new me(f);
				return r.ownerDocument = this, r.childNodes = new H(), r.nodeName = t, r.name = t, r.specified = !0, r.namespaceURI = n[0], r.prefix = n[1], r.localName = n[2], r;
			}
		}, k(te, Q), he.prototype = {
			nodeType: I,
			attributes: null,
			getQualifiedName: function() {
				return this.prefix ? this.prefix + ":" + this.localName : this.localName;
			},
			_isInHTMLDocumentAndNamespace: function() {
				return "html" === this.ownerDocument.type && this.namespaceURI === p.HTML;
			},
			hasAttributes: function() {
				return !(!this.attributes || !this.attributes.length);
			},
			hasAttribute: function(e) {
				return !!this.getAttributeNode(e);
			},
			getAttribute: function(e) {
				var t = this.getAttributeNode(e);
				return t ? t.value : null;
			},
			getAttributeNode: function(e) {
				return this._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase()), this.attributes.getNamedItem(e);
			},
			setAttribute: function(e, t) {
				this._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase());
				var n = this.getAttributeNode(e);
				n ? n.value = n.nodeValue = "" + t : ((n = this.ownerDocument._createAttribute(e)).value = n.nodeValue = "" + t, this.setAttributeNode(n));
			},
			removeAttribute: function(e) {
				var t = this.getAttributeNode(e);
				t && this.removeAttributeNode(t);
			},
			setAttributeNode: function(e) {
				return this.attributes.setNamedItem(e);
			},
			setAttributeNodeNS: function(e) {
				return this.attributes.setNamedItemNS(e);
			},
			removeAttributeNode: function(e) {
				return this.attributes.removeNamedItem(e.nodeName);
			},
			removeAttributeNS: function(e, t) {
				var n = this.getAttributeNodeNS(e, t);
				n && this.removeAttributeNode(n);
			},
			hasAttributeNS: function(e, t) {
				return null != this.getAttributeNodeNS(e, t);
			},
			getAttributeNS: function(e, t) {
				var n = this.getAttributeNodeNS(e, t);
				return n ? n.value : null;
			},
			setAttributeNS: function(e, t, n) {
				var r = N(e, t)[2], o = this.getAttributeNodeNS(e, r);
				o ? o.value = o.nodeValue = "" + n : ((o = this.ownerDocument.createAttributeNS(e, t)).value = o.nodeValue = "" + n, this.setAttributeNode(o));
			},
			getAttributeNodeNS: function(e, t) {
				return this.attributes.getNamedItemNS(e, t);
			},
			getElementsByClassName: function(e) {
				var t = x(e);
				return new j(this, function(n) {
					var r = [];
					return t.length > 0 && J(n, function(o) {
						if (o !== n && o.nodeType === I) {
							var i = o.getAttribute("class");
							if (i) {
								var a = e === i;
								if (!a) {
									var s = x(i);
									a = t.every((l = s, function(e) {
										return l && -1 !== l.indexOf(e);
									}));
								}
								a && r.push(o);
							}
						}
						var l;
					}), r;
				});
			},
			getElementsByTagName: function(e) {
				var t = "html" === (this.nodeType === M ? this : this.ownerDocument).type, n = e.toLowerCase();
				return new j(this, function(r) {
					var o = [];
					return J(r, function(i) {
						i !== r && i.nodeType === I && ("*" === e || i.getQualifiedName() === (t && i.namespaceURI === p.HTML ? n : e)) && o.push(i);
					}), o;
				});
			},
			getElementsByTagNameNS: function(e, t) {
				return new j(this, function(n) {
					var r = [];
					return J(n, function(o) {
						o === n || o.nodeType !== I || "*" !== e && o.namespaceURI !== e || "*" !== t && o.localName != t || r.push(o);
					}), r;
				});
			}
		}, te.prototype.getElementsByClassName = he.prototype.getElementsByClassName, te.prototype.getElementsByTagName = he.prototype.getElementsByTagName, te.prototype.getElementsByTagNameNS = he.prototype.getElementsByTagNameNS, k(he, Q), me.prototype.nodeType = _, k(me, Q), ge.prototype = {
			data: "",
			substringData: function(e, t) {
				return this.data.substring(e, e + t);
			},
			appendData: function(e) {
				e = this.data + e, this.nodeValue = this.data = e, this.length = e.length;
			},
			insertData: function(e, t) {
				this.replaceData(e, 0, t);
			},
			deleteData: function(e, t) {
				this.replaceData(e, t, "");
			},
			replaceData: function(e, t, n) {
				n = this.data.substring(0, e) + n + this.data.substring(e + t), this.nodeValue = this.data = n, this.length = n.length;
			}
		}, k(ge, Q), we.prototype = {
			nodeName: "#text",
			nodeType: C,
			splitText: function(e) {
				var t = this.data, n = t.substring(e);
				t = t.substring(0, e), this.data = this.nodeValue = t, this.length = t.length;
				var r = this.ownerDocument.createTextNode(n);
				return this.parentNode && this.parentNode.insertBefore(r, this.nextSibling), r;
			}
		}, k(we, ge), be.prototype = {
			nodeName: "#comment",
			nodeType: P
		}, k(be, ge), ve.prototype = {
			nodeName: "#cdata-section",
			nodeType: A
		}, k(ve, we), ye.prototype.nodeType = F, k(ye, Q), xe.prototype.nodeType = L, k(xe, Q), Se.prototype.nodeType = $, k(Se, Q), Ne.prototype.nodeType = R, k(Ne, Q), Ee.prototype.nodeName = "#document-fragment", Ee.prototype.nodeType = O, k(Ee, Q), ke.prototype.nodeType = D, k(ke, ge), Te.prototype.serializeToString = function(e, t) {
			return Ie.call(e, t);
		}, Q.prototype.toString = Ie;
		try {
			Object.defineProperty && (Object.defineProperty(j.prototype, "length", { get: function() {
				return q(this), this.$$length;
			} }), Object.defineProperty(Q.prototype, "textContent", {
				get: function() {
					if (this.nodeType === I || this.nodeType === O) {
						var e = [];
						return ee(this, null, { enter: function(t) {
							return t.nodeType === I || t.nodeType === O || (t.nodeType === D || t.nodeType === P ? null : void e.push(t.nodeValue));
						} }), e.join("");
					}
					return this.nodeValue;
				},
				set: function(e) {
					switch (this.nodeType) {
						case I:
						case O:
							for (; this.firstChild;) this.removeChild(this.firstChild);
							(e || String(e)) && this.appendChild(this.ownerDocument.createTextNode(e));
							break;
						default: this.data = e, this.value = e, this.nodeValue = e;
					}
				}
			}), Object.defineProperty(ge.prototype, "data", {
				get: function() {
					return null != this._data ? this._data : "";
				},
				set: function(e) {
					this._data = e, this.length = "string" == typeof e ? e.length : 0;
				}
			}), Object.defineProperty(ge.prototype, "nodeValue", {
				get: function() {
					return this.data;
				},
				set: function(e) {
					this.data = e;
				},
				enumerable: !0,
				configurable: !0
			}), Object.defineProperty(he.prototype, "children", { get: function() {
				return new j(this, De);
			} }), Object.defineProperty(te.prototype, "children", { get: function() {
				return new j(this, De);
			} }), Object.defineProperty(Ee.prototype, "children", { get: function() {
				return new j(this, De);
			} }), $e = function(e, t, n) {
				e["$$" + t] = n;
			});
		} catch (Pe) {}
		e._updateLiveList = q, e.Attr = me, e.CDATASection = ve, e.CharacterData = ge, e.Comment = be, e.Document = te, e.DocumentFragment = Ee, e.DocumentType = ye, e.DOMImplementation = Y, e.Element = he, e.Entity = Se, e.EntityReference = Ne, e.LiveNodeList = j, e.NamedNodeMap = W, e.Node = Q, e.NodeList = H, e.Notation = xe, e.Text = we, e.ProcessingInstruction = ke, e.walkDOM = ee, e.XMLSerializer = Te;
	}), f = a((e) => {
		var t = c().freeze;
		e.XML_ENTITIES = t({
			amp: "&",
			apos: "'",
			gt: ">",
			lt: "<",
			quot: "\""
		}), e.HTML_ENTITIES = t({
			Aacute: "Á",
			aacute: "á",
			Abreve: "Ă",
			abreve: "ă",
			ac: "∾",
			acd: "∿",
			acE: "∾̳",
			Acirc: "Â",
			acirc: "â",
			acute: "´",
			Acy: "А",
			acy: "а",
			AElig: "Æ",
			aelig: "æ",
			af: "⁡",
			Afr: "𝔄",
			afr: "𝔞",
			Agrave: "À",
			agrave: "à",
			alefsym: "ℵ",
			aleph: "ℵ",
			Alpha: "Α",
			alpha: "α",
			Amacr: "Ā",
			amacr: "ā",
			amalg: "⨿",
			AMP: "&",
			amp: "&",
			And: "⩓",
			and: "∧",
			andand: "⩕",
			andd: "⩜",
			andslope: "⩘",
			andv: "⩚",
			ang: "∠",
			ange: "⦤",
			angle: "∠",
			angmsd: "∡",
			angmsdaa: "⦨",
			angmsdab: "⦩",
			angmsdac: "⦪",
			angmsdad: "⦫",
			angmsdae: "⦬",
			angmsdaf: "⦭",
			angmsdag: "⦮",
			angmsdah: "⦯",
			angrt: "∟",
			angrtvb: "⊾",
			angrtvbd: "⦝",
			angsph: "∢",
			angst: "Å",
			angzarr: "⍼",
			Aogon: "Ą",
			aogon: "ą",
			Aopf: "𝔸",
			aopf: "𝕒",
			ap: "≈",
			apacir: "⩯",
			apE: "⩰",
			ape: "≊",
			apid: "≋",
			apos: "'",
			ApplyFunction: "⁡",
			approx: "≈",
			approxeq: "≊",
			Aring: "Å",
			aring: "å",
			Ascr: "𝒜",
			ascr: "𝒶",
			Assign: "≔",
			ast: "*",
			asymp: "≈",
			asympeq: "≍",
			Atilde: "Ã",
			atilde: "ã",
			Auml: "Ä",
			auml: "ä",
			awconint: "∳",
			awint: "⨑",
			backcong: "≌",
			backepsilon: "϶",
			backprime: "‵",
			backsim: "∽",
			backsimeq: "⋍",
			Backslash: "∖",
			Barv: "⫧",
			barvee: "⊽",
			Barwed: "⌆",
			barwed: "⌅",
			barwedge: "⌅",
			bbrk: "⎵",
			bbrktbrk: "⎶",
			bcong: "≌",
			Bcy: "Б",
			bcy: "б",
			bdquo: "„",
			becaus: "∵",
			Because: "∵",
			because: "∵",
			bemptyv: "⦰",
			bepsi: "϶",
			bernou: "ℬ",
			Bernoullis: "ℬ",
			Beta: "Β",
			beta: "β",
			beth: "ℶ",
			between: "≬",
			Bfr: "𝔅",
			bfr: "𝔟",
			bigcap: "⋂",
			bigcirc: "◯",
			bigcup: "⋃",
			bigodot: "⨀",
			bigoplus: "⨁",
			bigotimes: "⨂",
			bigsqcup: "⨆",
			bigstar: "★",
			bigtriangledown: "▽",
			bigtriangleup: "△",
			biguplus: "⨄",
			bigvee: "⋁",
			bigwedge: "⋀",
			bkarow: "⤍",
			blacklozenge: "⧫",
			blacksquare: "▪",
			blacktriangle: "▴",
			blacktriangledown: "▾",
			blacktriangleleft: "◂",
			blacktriangleright: "▸",
			blank: "␣",
			blk12: "▒",
			blk14: "░",
			blk34: "▓",
			block: "█",
			bne: "=⃥",
			bnequiv: "≡⃥",
			bNot: "⫭",
			bnot: "⌐",
			Bopf: "𝔹",
			bopf: "𝕓",
			bot: "⊥",
			bottom: "⊥",
			bowtie: "⋈",
			boxbox: "⧉",
			boxDL: "╗",
			boxDl: "╖",
			boxdL: "╕",
			boxdl: "┐",
			boxDR: "╔",
			boxDr: "╓",
			boxdR: "╒",
			boxdr: "┌",
			boxH: "═",
			boxh: "─",
			boxHD: "╦",
			boxHd: "╤",
			boxhD: "╥",
			boxhd: "┬",
			boxHU: "╩",
			boxHu: "╧",
			boxhU: "╨",
			boxhu: "┴",
			boxminus: "⊟",
			boxplus: "⊞",
			boxtimes: "⊠",
			boxUL: "╝",
			boxUl: "╜",
			boxuL: "╛",
			boxul: "┘",
			boxUR: "╚",
			boxUr: "╙",
			boxuR: "╘",
			boxur: "└",
			boxV: "║",
			boxv: "│",
			boxVH: "╬",
			boxVh: "╫",
			boxvH: "╪",
			boxvh: "┼",
			boxVL: "╣",
			boxVl: "╢",
			boxvL: "╡",
			boxvl: "┤",
			boxVR: "╠",
			boxVr: "╟",
			boxvR: "╞",
			boxvr: "├",
			bprime: "‵",
			Breve: "˘",
			breve: "˘",
			brvbar: "¦",
			Bscr: "ℬ",
			bscr: "𝒷",
			bsemi: "⁏",
			bsim: "∽",
			bsime: "⋍",
			bsol: "\\",
			bsolb: "⧅",
			bsolhsub: "⟈",
			bull: "•",
			bullet: "•",
			bump: "≎",
			bumpE: "⪮",
			bumpe: "≏",
			Bumpeq: "≎",
			bumpeq: "≏",
			Cacute: "Ć",
			cacute: "ć",
			Cap: "⋒",
			cap: "∩",
			capand: "⩄",
			capbrcup: "⩉",
			capcap: "⩋",
			capcup: "⩇",
			capdot: "⩀",
			CapitalDifferentialD: "ⅅ",
			caps: "∩︀",
			caret: "⁁",
			caron: "ˇ",
			Cayleys: "ℭ",
			ccaps: "⩍",
			Ccaron: "Č",
			ccaron: "č",
			Ccedil: "Ç",
			ccedil: "ç",
			Ccirc: "Ĉ",
			ccirc: "ĉ",
			Cconint: "∰",
			ccups: "⩌",
			ccupssm: "⩐",
			Cdot: "Ċ",
			cdot: "ċ",
			cedil: "¸",
			Cedilla: "¸",
			cemptyv: "⦲",
			cent: "¢",
			CenterDot: "·",
			centerdot: "·",
			Cfr: "ℭ",
			cfr: "𝔠",
			CHcy: "Ч",
			chcy: "ч",
			check: "✓",
			checkmark: "✓",
			Chi: "Χ",
			chi: "χ",
			cir: "○",
			circ: "ˆ",
			circeq: "≗",
			circlearrowleft: "↺",
			circlearrowright: "↻",
			circledast: "⊛",
			circledcirc: "⊚",
			circleddash: "⊝",
			CircleDot: "⊙",
			circledR: "®",
			circledS: "Ⓢ",
			CircleMinus: "⊖",
			CirclePlus: "⊕",
			CircleTimes: "⊗",
			cirE: "⧃",
			cire: "≗",
			cirfnint: "⨐",
			cirmid: "⫯",
			cirscir: "⧂",
			ClockwiseContourIntegral: "∲",
			CloseCurlyDoubleQuote: "”",
			CloseCurlyQuote: "’",
			clubs: "♣",
			clubsuit: "♣",
			Colon: "∷",
			colon: ":",
			Colone: "⩴",
			colone: "≔",
			coloneq: "≔",
			comma: ",",
			commat: "@",
			comp: "∁",
			compfn: "∘",
			complement: "∁",
			complexes: "ℂ",
			cong: "≅",
			congdot: "⩭",
			Congruent: "≡",
			Conint: "∯",
			conint: "∮",
			ContourIntegral: "∮",
			Copf: "ℂ",
			copf: "𝕔",
			coprod: "∐",
			Coproduct: "∐",
			COPY: "©",
			copy: "©",
			copysr: "℗",
			CounterClockwiseContourIntegral: "∳",
			crarr: "↵",
			Cross: "⨯",
			cross: "✗",
			Cscr: "𝒞",
			cscr: "𝒸",
			csub: "⫏",
			csube: "⫑",
			csup: "⫐",
			csupe: "⫒",
			ctdot: "⋯",
			cudarrl: "⤸",
			cudarrr: "⤵",
			cuepr: "⋞",
			cuesc: "⋟",
			cularr: "↶",
			cularrp: "⤽",
			Cup: "⋓",
			cup: "∪",
			cupbrcap: "⩈",
			CupCap: "≍",
			cupcap: "⩆",
			cupcup: "⩊",
			cupdot: "⊍",
			cupor: "⩅",
			cups: "∪︀",
			curarr: "↷",
			curarrm: "⤼",
			curlyeqprec: "⋞",
			curlyeqsucc: "⋟",
			curlyvee: "⋎",
			curlywedge: "⋏",
			curren: "¤",
			curvearrowleft: "↶",
			curvearrowright: "↷",
			cuvee: "⋎",
			cuwed: "⋏",
			cwconint: "∲",
			cwint: "∱",
			cylcty: "⌭",
			Dagger: "‡",
			dagger: "†",
			daleth: "ℸ",
			Darr: "↡",
			dArr: "⇓",
			darr: "↓",
			dash: "‐",
			Dashv: "⫤",
			dashv: "⊣",
			dbkarow: "⤏",
			dblac: "˝",
			Dcaron: "Ď",
			dcaron: "ď",
			Dcy: "Д",
			dcy: "д",
			DD: "ⅅ",
			dd: "ⅆ",
			ddagger: "‡",
			ddarr: "⇊",
			DDotrahd: "⤑",
			ddotseq: "⩷",
			deg: "°",
			Del: "∇",
			Delta: "Δ",
			delta: "δ",
			demptyv: "⦱",
			dfisht: "⥿",
			Dfr: "𝔇",
			dfr: "𝔡",
			dHar: "⥥",
			dharl: "⇃",
			dharr: "⇂",
			DiacriticalAcute: "´",
			DiacriticalDot: "˙",
			DiacriticalDoubleAcute: "˝",
			DiacriticalGrave: "`",
			DiacriticalTilde: "˜",
			diam: "⋄",
			Diamond: "⋄",
			diamond: "⋄",
			diamondsuit: "♦",
			diams: "♦",
			die: "¨",
			DifferentialD: "ⅆ",
			digamma: "ϝ",
			disin: "⋲",
			div: "÷",
			divide: "÷",
			divideontimes: "⋇",
			divonx: "⋇",
			DJcy: "Ђ",
			djcy: "ђ",
			dlcorn: "⌞",
			dlcrop: "⌍",
			dollar: "$",
			Dopf: "𝔻",
			dopf: "𝕕",
			Dot: "¨",
			dot: "˙",
			DotDot: "⃜",
			doteq: "≐",
			doteqdot: "≑",
			DotEqual: "≐",
			dotminus: "∸",
			dotplus: "∔",
			dotsquare: "⊡",
			doublebarwedge: "⌆",
			DoubleContourIntegral: "∯",
			DoubleDot: "¨",
			DoubleDownArrow: "⇓",
			DoubleLeftArrow: "⇐",
			DoubleLeftRightArrow: "⇔",
			DoubleLeftTee: "⫤",
			DoubleLongLeftArrow: "⟸",
			DoubleLongLeftRightArrow: "⟺",
			DoubleLongRightArrow: "⟹",
			DoubleRightArrow: "⇒",
			DoubleRightTee: "⊨",
			DoubleUpArrow: "⇑",
			DoubleUpDownArrow: "⇕",
			DoubleVerticalBar: "∥",
			DownArrow: "↓",
			Downarrow: "⇓",
			downarrow: "↓",
			DownArrowBar: "⤓",
			DownArrowUpArrow: "⇵",
			DownBreve: "̑",
			downdownarrows: "⇊",
			downharpoonleft: "⇃",
			downharpoonright: "⇂",
			DownLeftRightVector: "⥐",
			DownLeftTeeVector: "⥞",
			DownLeftVector: "↽",
			DownLeftVectorBar: "⥖",
			DownRightTeeVector: "⥟",
			DownRightVector: "⇁",
			DownRightVectorBar: "⥗",
			DownTee: "⊤",
			DownTeeArrow: "↧",
			drbkarow: "⤐",
			drcorn: "⌟",
			drcrop: "⌌",
			Dscr: "𝒟",
			dscr: "𝒹",
			DScy: "Ѕ",
			dscy: "ѕ",
			dsol: "⧶",
			Dstrok: "Đ",
			dstrok: "đ",
			dtdot: "⋱",
			dtri: "▿",
			dtrif: "▾",
			duarr: "⇵",
			duhar: "⥯",
			dwangle: "⦦",
			DZcy: "Џ",
			dzcy: "џ",
			dzigrarr: "⟿",
			Eacute: "É",
			eacute: "é",
			easter: "⩮",
			Ecaron: "Ě",
			ecaron: "ě",
			ecir: "≖",
			Ecirc: "Ê",
			ecirc: "ê",
			ecolon: "≕",
			Ecy: "Э",
			ecy: "э",
			eDDot: "⩷",
			Edot: "Ė",
			eDot: "≑",
			edot: "ė",
			ee: "ⅇ",
			efDot: "≒",
			Efr: "𝔈",
			efr: "𝔢",
			eg: "⪚",
			Egrave: "È",
			egrave: "è",
			egs: "⪖",
			egsdot: "⪘",
			el: "⪙",
			Element: "∈",
			elinters: "⏧",
			ell: "ℓ",
			els: "⪕",
			elsdot: "⪗",
			Emacr: "Ē",
			emacr: "ē",
			empty: "∅",
			emptyset: "∅",
			EmptySmallSquare: "◻",
			emptyv: "∅",
			EmptyVerySmallSquare: "▫",
			emsp: " ",
			emsp13: " ",
			emsp14: " ",
			ENG: "Ŋ",
			eng: "ŋ",
			ensp: " ",
			Eogon: "Ę",
			eogon: "ę",
			Eopf: "𝔼",
			eopf: "𝕖",
			epar: "⋕",
			eparsl: "⧣",
			eplus: "⩱",
			epsi: "ε",
			Epsilon: "Ε",
			epsilon: "ε",
			epsiv: "ϵ",
			eqcirc: "≖",
			eqcolon: "≕",
			eqsim: "≂",
			eqslantgtr: "⪖",
			eqslantless: "⪕",
			Equal: "⩵",
			equals: "=",
			EqualTilde: "≂",
			equest: "≟",
			Equilibrium: "⇌",
			equiv: "≡",
			equivDD: "⩸",
			eqvparsl: "⧥",
			erarr: "⥱",
			erDot: "≓",
			Escr: "ℰ",
			escr: "ℯ",
			esdot: "≐",
			Esim: "⩳",
			esim: "≂",
			Eta: "Η",
			eta: "η",
			ETH: "Ð",
			eth: "ð",
			Euml: "Ë",
			euml: "ë",
			euro: "€",
			excl: "!",
			exist: "∃",
			Exists: "∃",
			expectation: "ℰ",
			ExponentialE: "ⅇ",
			exponentiale: "ⅇ",
			fallingdotseq: "≒",
			Fcy: "Ф",
			fcy: "ф",
			female: "♀",
			ffilig: "ﬃ",
			fflig: "ﬀ",
			ffllig: "ﬄ",
			Ffr: "𝔉",
			ffr: "𝔣",
			filig: "ﬁ",
			FilledSmallSquare: "◼",
			FilledVerySmallSquare: "▪",
			fjlig: "fj",
			flat: "♭",
			fllig: "ﬂ",
			fltns: "▱",
			fnof: "ƒ",
			Fopf: "𝔽",
			fopf: "𝕗",
			ForAll: "∀",
			forall: "∀",
			fork: "⋔",
			forkv: "⫙",
			Fouriertrf: "ℱ",
			fpartint: "⨍",
			frac12: "½",
			frac13: "⅓",
			frac14: "¼",
			frac15: "⅕",
			frac16: "⅙",
			frac18: "⅛",
			frac23: "⅔",
			frac25: "⅖",
			frac34: "¾",
			frac35: "⅗",
			frac38: "⅜",
			frac45: "⅘",
			frac56: "⅚",
			frac58: "⅝",
			frac78: "⅞",
			frasl: "⁄",
			frown: "⌢",
			Fscr: "ℱ",
			fscr: "𝒻",
			gacute: "ǵ",
			Gamma: "Γ",
			gamma: "γ",
			Gammad: "Ϝ",
			gammad: "ϝ",
			gap: "⪆",
			Gbreve: "Ğ",
			gbreve: "ğ",
			Gcedil: "Ģ",
			Gcirc: "Ĝ",
			gcirc: "ĝ",
			Gcy: "Г",
			gcy: "г",
			Gdot: "Ġ",
			gdot: "ġ",
			gE: "≧",
			ge: "≥",
			gEl: "⪌",
			gel: "⋛",
			geq: "≥",
			geqq: "≧",
			geqslant: "⩾",
			ges: "⩾",
			gescc: "⪩",
			gesdot: "⪀",
			gesdoto: "⪂",
			gesdotol: "⪄",
			gesl: "⋛︀",
			gesles: "⪔",
			Gfr: "𝔊",
			gfr: "𝔤",
			Gg: "⋙",
			gg: "≫",
			ggg: "⋙",
			gimel: "ℷ",
			GJcy: "Ѓ",
			gjcy: "ѓ",
			gl: "≷",
			gla: "⪥",
			glE: "⪒",
			glj: "⪤",
			gnap: "⪊",
			gnapprox: "⪊",
			gnE: "≩",
			gne: "⪈",
			gneq: "⪈",
			gneqq: "≩",
			gnsim: "⋧",
			Gopf: "𝔾",
			gopf: "𝕘",
			grave: "`",
			GreaterEqual: "≥",
			GreaterEqualLess: "⋛",
			GreaterFullEqual: "≧",
			GreaterGreater: "⪢",
			GreaterLess: "≷",
			GreaterSlantEqual: "⩾",
			GreaterTilde: "≳",
			Gscr: "𝒢",
			gscr: "ℊ",
			gsim: "≳",
			gsime: "⪎",
			gsiml: "⪐",
			Gt: "≫",
			GT: ">",
			gt: ">",
			gtcc: "⪧",
			gtcir: "⩺",
			gtdot: "⋗",
			gtlPar: "⦕",
			gtquest: "⩼",
			gtrapprox: "⪆",
			gtrarr: "⥸",
			gtrdot: "⋗",
			gtreqless: "⋛",
			gtreqqless: "⪌",
			gtrless: "≷",
			gtrsim: "≳",
			gvertneqq: "≩︀",
			gvnE: "≩︀",
			Hacek: "ˇ",
			hairsp: " ",
			half: "½",
			hamilt: "ℋ",
			HARDcy: "Ъ",
			hardcy: "ъ",
			hArr: "⇔",
			harr: "↔",
			harrcir: "⥈",
			harrw: "↭",
			Hat: "^",
			hbar: "ℏ",
			Hcirc: "Ĥ",
			hcirc: "ĥ",
			hearts: "♥",
			heartsuit: "♥",
			hellip: "…",
			hercon: "⊹",
			Hfr: "ℌ",
			hfr: "𝔥",
			HilbertSpace: "ℋ",
			hksearow: "⤥",
			hkswarow: "⤦",
			hoarr: "⇿",
			homtht: "∻",
			hookleftarrow: "↩",
			hookrightarrow: "↪",
			Hopf: "ℍ",
			hopf: "𝕙",
			horbar: "―",
			HorizontalLine: "─",
			Hscr: "ℋ",
			hscr: "𝒽",
			hslash: "ℏ",
			Hstrok: "Ħ",
			hstrok: "ħ",
			HumpDownHump: "≎",
			HumpEqual: "≏",
			hybull: "⁃",
			hyphen: "‐",
			Iacute: "Í",
			iacute: "í",
			ic: "⁣",
			Icirc: "Î",
			icirc: "î",
			Icy: "И",
			icy: "и",
			Idot: "İ",
			IEcy: "Е",
			iecy: "е",
			iexcl: "¡",
			iff: "⇔",
			Ifr: "ℑ",
			ifr: "𝔦",
			Igrave: "Ì",
			igrave: "ì",
			ii: "ⅈ",
			iiiint: "⨌",
			iiint: "∭",
			iinfin: "⧜",
			iiota: "℩",
			IJlig: "Ĳ",
			ijlig: "ĳ",
			Im: "ℑ",
			Imacr: "Ī",
			imacr: "ī",
			image: "ℑ",
			ImaginaryI: "ⅈ",
			imagline: "ℐ",
			imagpart: "ℑ",
			imath: "ı",
			imof: "⊷",
			imped: "Ƶ",
			Implies: "⇒",
			in: "∈",
			incare: "℅",
			infin: "∞",
			infintie: "⧝",
			inodot: "ı",
			Int: "∬",
			int: "∫",
			intcal: "⊺",
			integers: "ℤ",
			Integral: "∫",
			intercal: "⊺",
			Intersection: "⋂",
			intlarhk: "⨗",
			intprod: "⨼",
			InvisibleComma: "⁣",
			InvisibleTimes: "⁢",
			IOcy: "Ё",
			iocy: "ё",
			Iogon: "Į",
			iogon: "į",
			Iopf: "𝕀",
			iopf: "𝕚",
			Iota: "Ι",
			iota: "ι",
			iprod: "⨼",
			iquest: "¿",
			Iscr: "ℐ",
			iscr: "𝒾",
			isin: "∈",
			isindot: "⋵",
			isinE: "⋹",
			isins: "⋴",
			isinsv: "⋳",
			isinv: "∈",
			it: "⁢",
			Itilde: "Ĩ",
			itilde: "ĩ",
			Iukcy: "І",
			iukcy: "і",
			Iuml: "Ï",
			iuml: "ï",
			Jcirc: "Ĵ",
			jcirc: "ĵ",
			Jcy: "Й",
			jcy: "й",
			Jfr: "𝔍",
			jfr: "𝔧",
			jmath: "ȷ",
			Jopf: "𝕁",
			jopf: "𝕛",
			Jscr: "𝒥",
			jscr: "𝒿",
			Jsercy: "Ј",
			jsercy: "ј",
			Jukcy: "Є",
			jukcy: "є",
			Kappa: "Κ",
			kappa: "κ",
			kappav: "ϰ",
			Kcedil: "Ķ",
			kcedil: "ķ",
			Kcy: "К",
			kcy: "к",
			Kfr: "𝔎",
			kfr: "𝔨",
			kgreen: "ĸ",
			KHcy: "Х",
			khcy: "х",
			KJcy: "Ќ",
			kjcy: "ќ",
			Kopf: "𝕂",
			kopf: "𝕜",
			Kscr: "𝒦",
			kscr: "𝓀",
			lAarr: "⇚",
			Lacute: "Ĺ",
			lacute: "ĺ",
			laemptyv: "⦴",
			lagran: "ℒ",
			Lambda: "Λ",
			lambda: "λ",
			Lang: "⟪",
			lang: "⟨",
			langd: "⦑",
			langle: "⟨",
			lap: "⪅",
			Laplacetrf: "ℒ",
			laquo: "«",
			Larr: "↞",
			lArr: "⇐",
			larr: "←",
			larrb: "⇤",
			larrbfs: "⤟",
			larrfs: "⤝",
			larrhk: "↩",
			larrlp: "↫",
			larrpl: "⤹",
			larrsim: "⥳",
			larrtl: "↢",
			lat: "⪫",
			lAtail: "⤛",
			latail: "⤙",
			late: "⪭",
			lates: "⪭︀",
			lBarr: "⤎",
			lbarr: "⤌",
			lbbrk: "❲",
			lbrace: "{",
			lbrack: "[",
			lbrke: "⦋",
			lbrksld: "⦏",
			lbrkslu: "⦍",
			Lcaron: "Ľ",
			lcaron: "ľ",
			Lcedil: "Ļ",
			lcedil: "ļ",
			lceil: "⌈",
			lcub: "{",
			Lcy: "Л",
			lcy: "л",
			ldca: "⤶",
			ldquo: "“",
			ldquor: "„",
			ldrdhar: "⥧",
			ldrushar: "⥋",
			ldsh: "↲",
			lE: "≦",
			le: "≤",
			LeftAngleBracket: "⟨",
			LeftArrow: "←",
			Leftarrow: "⇐",
			leftarrow: "←",
			LeftArrowBar: "⇤",
			LeftArrowRightArrow: "⇆",
			leftarrowtail: "↢",
			LeftCeiling: "⌈",
			LeftDoubleBracket: "⟦",
			LeftDownTeeVector: "⥡",
			LeftDownVector: "⇃",
			LeftDownVectorBar: "⥙",
			LeftFloor: "⌊",
			leftharpoondown: "↽",
			leftharpoonup: "↼",
			leftleftarrows: "⇇",
			LeftRightArrow: "↔",
			Leftrightarrow: "⇔",
			leftrightarrow: "↔",
			leftrightarrows: "⇆",
			leftrightharpoons: "⇋",
			leftrightsquigarrow: "↭",
			LeftRightVector: "⥎",
			LeftTee: "⊣",
			LeftTeeArrow: "↤",
			LeftTeeVector: "⥚",
			leftthreetimes: "⋋",
			LeftTriangle: "⊲",
			LeftTriangleBar: "⧏",
			LeftTriangleEqual: "⊴",
			LeftUpDownVector: "⥑",
			LeftUpTeeVector: "⥠",
			LeftUpVector: "↿",
			LeftUpVectorBar: "⥘",
			LeftVector: "↼",
			LeftVectorBar: "⥒",
			lEg: "⪋",
			leg: "⋚",
			leq: "≤",
			leqq: "≦",
			leqslant: "⩽",
			les: "⩽",
			lescc: "⪨",
			lesdot: "⩿",
			lesdoto: "⪁",
			lesdotor: "⪃",
			lesg: "⋚︀",
			lesges: "⪓",
			lessapprox: "⪅",
			lessdot: "⋖",
			lesseqgtr: "⋚",
			lesseqqgtr: "⪋",
			LessEqualGreater: "⋚",
			LessFullEqual: "≦",
			LessGreater: "≶",
			lessgtr: "≶",
			LessLess: "⪡",
			lesssim: "≲",
			LessSlantEqual: "⩽",
			LessTilde: "≲",
			lfisht: "⥼",
			lfloor: "⌊",
			Lfr: "𝔏",
			lfr: "𝔩",
			lg: "≶",
			lgE: "⪑",
			lHar: "⥢",
			lhard: "↽",
			lharu: "↼",
			lharul: "⥪",
			lhblk: "▄",
			LJcy: "Љ",
			ljcy: "љ",
			Ll: "⋘",
			ll: "≪",
			llarr: "⇇",
			llcorner: "⌞",
			Lleftarrow: "⇚",
			llhard: "⥫",
			lltri: "◺",
			Lmidot: "Ŀ",
			lmidot: "ŀ",
			lmoust: "⎰",
			lmoustache: "⎰",
			lnap: "⪉",
			lnapprox: "⪉",
			lnE: "≨",
			lne: "⪇",
			lneq: "⪇",
			lneqq: "≨",
			lnsim: "⋦",
			loang: "⟬",
			loarr: "⇽",
			lobrk: "⟦",
			LongLeftArrow: "⟵",
			Longleftarrow: "⟸",
			longleftarrow: "⟵",
			LongLeftRightArrow: "⟷",
			Longleftrightarrow: "⟺",
			longleftrightarrow: "⟷",
			longmapsto: "⟼",
			LongRightArrow: "⟶",
			Longrightarrow: "⟹",
			longrightarrow: "⟶",
			looparrowleft: "↫",
			looparrowright: "↬",
			lopar: "⦅",
			Lopf: "𝕃",
			lopf: "𝕝",
			loplus: "⨭",
			lotimes: "⨴",
			lowast: "∗",
			lowbar: "_",
			LowerLeftArrow: "↙",
			LowerRightArrow: "↘",
			loz: "◊",
			lozenge: "◊",
			lozf: "⧫",
			lpar: "(",
			lparlt: "⦓",
			lrarr: "⇆",
			lrcorner: "⌟",
			lrhar: "⇋",
			lrhard: "⥭",
			lrm: "‎",
			lrtri: "⊿",
			lsaquo: "‹",
			Lscr: "ℒ",
			lscr: "𝓁",
			Lsh: "↰",
			lsh: "↰",
			lsim: "≲",
			lsime: "⪍",
			lsimg: "⪏",
			lsqb: "[",
			lsquo: "‘",
			lsquor: "‚",
			Lstrok: "Ł",
			lstrok: "ł",
			Lt: "≪",
			LT: "<",
			lt: "<",
			ltcc: "⪦",
			ltcir: "⩹",
			ltdot: "⋖",
			lthree: "⋋",
			ltimes: "⋉",
			ltlarr: "⥶",
			ltquest: "⩻",
			ltri: "◃",
			ltrie: "⊴",
			ltrif: "◂",
			ltrPar: "⦖",
			lurdshar: "⥊",
			luruhar: "⥦",
			lvertneqq: "≨︀",
			lvnE: "≨︀",
			macr: "¯",
			male: "♂",
			malt: "✠",
			maltese: "✠",
			Map: "⤅",
			map: "↦",
			mapsto: "↦",
			mapstodown: "↧",
			mapstoleft: "↤",
			mapstoup: "↥",
			marker: "▮",
			mcomma: "⨩",
			Mcy: "М",
			mcy: "м",
			mdash: "—",
			mDDot: "∺",
			measuredangle: "∡",
			MediumSpace: " ",
			Mellintrf: "ℳ",
			Mfr: "𝔐",
			mfr: "𝔪",
			mho: "℧",
			micro: "µ",
			mid: "∣",
			midast: "*",
			midcir: "⫰",
			middot: "·",
			minus: "−",
			minusb: "⊟",
			minusd: "∸",
			minusdu: "⨪",
			MinusPlus: "∓",
			mlcp: "⫛",
			mldr: "…",
			mnplus: "∓",
			models: "⊧",
			Mopf: "𝕄",
			mopf: "𝕞",
			mp: "∓",
			Mscr: "ℳ",
			mscr: "𝓂",
			mstpos: "∾",
			Mu: "Μ",
			mu: "μ",
			multimap: "⊸",
			mumap: "⊸",
			nabla: "∇",
			Nacute: "Ń",
			nacute: "ń",
			nang: "∠⃒",
			nap: "≉",
			napE: "⩰̸",
			napid: "≋̸",
			napos: "ŉ",
			napprox: "≉",
			natur: "♮",
			natural: "♮",
			naturals: "ℕ",
			nbsp: "\xA0",
			nbump: "≎̸",
			nbumpe: "≏̸",
			ncap: "⩃",
			Ncaron: "Ň",
			ncaron: "ň",
			Ncedil: "Ņ",
			ncedil: "ņ",
			ncong: "≇",
			ncongdot: "⩭̸",
			ncup: "⩂",
			Ncy: "Н",
			ncy: "н",
			ndash: "–",
			ne: "≠",
			nearhk: "⤤",
			neArr: "⇗",
			nearr: "↗",
			nearrow: "↗",
			nedot: "≐̸",
			NegativeMediumSpace: "​",
			NegativeThickSpace: "​",
			NegativeThinSpace: "​",
			NegativeVeryThinSpace: "​",
			nequiv: "≢",
			nesear: "⤨",
			nesim: "≂̸",
			NestedGreaterGreater: "≫",
			NestedLessLess: "≪",
			NewLine: "\n",
			nexist: "∄",
			nexists: "∄",
			Nfr: "𝔑",
			nfr: "𝔫",
			ngE: "≧̸",
			nge: "≱",
			ngeq: "≱",
			ngeqq: "≧̸",
			ngeqslant: "⩾̸",
			nges: "⩾̸",
			nGg: "⋙̸",
			ngsim: "≵",
			nGt: "≫⃒",
			ngt: "≯",
			ngtr: "≯",
			nGtv: "≫̸",
			nhArr: "⇎",
			nharr: "↮",
			nhpar: "⫲",
			ni: "∋",
			nis: "⋼",
			nisd: "⋺",
			niv: "∋",
			NJcy: "Њ",
			njcy: "њ",
			nlArr: "⇍",
			nlarr: "↚",
			nldr: "‥",
			nlE: "≦̸",
			nle: "≰",
			nLeftarrow: "⇍",
			nleftarrow: "↚",
			nLeftrightarrow: "⇎",
			nleftrightarrow: "↮",
			nleq: "≰",
			nleqq: "≦̸",
			nleqslant: "⩽̸",
			nles: "⩽̸",
			nless: "≮",
			nLl: "⋘̸",
			nlsim: "≴",
			nLt: "≪⃒",
			nlt: "≮",
			nltri: "⋪",
			nltrie: "⋬",
			nLtv: "≪̸",
			nmid: "∤",
			NoBreak: "⁠",
			NonBreakingSpace: "\xA0",
			Nopf: "ℕ",
			nopf: "𝕟",
			Not: "⫬",
			not: "¬",
			NotCongruent: "≢",
			NotCupCap: "≭",
			NotDoubleVerticalBar: "∦",
			NotElement: "∉",
			NotEqual: "≠",
			NotEqualTilde: "≂̸",
			NotExists: "∄",
			NotGreater: "≯",
			NotGreaterEqual: "≱",
			NotGreaterFullEqual: "≧̸",
			NotGreaterGreater: "≫̸",
			NotGreaterLess: "≹",
			NotGreaterSlantEqual: "⩾̸",
			NotGreaterTilde: "≵",
			NotHumpDownHump: "≎̸",
			NotHumpEqual: "≏̸",
			notin: "∉",
			notindot: "⋵̸",
			notinE: "⋹̸",
			notinva: "∉",
			notinvb: "⋷",
			notinvc: "⋶",
			NotLeftTriangle: "⋪",
			NotLeftTriangleBar: "⧏̸",
			NotLeftTriangleEqual: "⋬",
			NotLess: "≮",
			NotLessEqual: "≰",
			NotLessGreater: "≸",
			NotLessLess: "≪̸",
			NotLessSlantEqual: "⩽̸",
			NotLessTilde: "≴",
			NotNestedGreaterGreater: "⪢̸",
			NotNestedLessLess: "⪡̸",
			notni: "∌",
			notniva: "∌",
			notnivb: "⋾",
			notnivc: "⋽",
			NotPrecedes: "⊀",
			NotPrecedesEqual: "⪯̸",
			NotPrecedesSlantEqual: "⋠",
			NotReverseElement: "∌",
			NotRightTriangle: "⋫",
			NotRightTriangleBar: "⧐̸",
			NotRightTriangleEqual: "⋭",
			NotSquareSubset: "⊏̸",
			NotSquareSubsetEqual: "⋢",
			NotSquareSuperset: "⊐̸",
			NotSquareSupersetEqual: "⋣",
			NotSubset: "⊂⃒",
			NotSubsetEqual: "⊈",
			NotSucceeds: "⊁",
			NotSucceedsEqual: "⪰̸",
			NotSucceedsSlantEqual: "⋡",
			NotSucceedsTilde: "≿̸",
			NotSuperset: "⊃⃒",
			NotSupersetEqual: "⊉",
			NotTilde: "≁",
			NotTildeEqual: "≄",
			NotTildeFullEqual: "≇",
			NotTildeTilde: "≉",
			NotVerticalBar: "∤",
			npar: "∦",
			nparallel: "∦",
			nparsl: "⫽⃥",
			npart: "∂̸",
			npolint: "⨔",
			npr: "⊀",
			nprcue: "⋠",
			npre: "⪯̸",
			nprec: "⊀",
			npreceq: "⪯̸",
			nrArr: "⇏",
			nrarr: "↛",
			nrarrc: "⤳̸",
			nrarrw: "↝̸",
			nRightarrow: "⇏",
			nrightarrow: "↛",
			nrtri: "⋫",
			nrtrie: "⋭",
			nsc: "⊁",
			nsccue: "⋡",
			nsce: "⪰̸",
			Nscr: "𝒩",
			nscr: "𝓃",
			nshortmid: "∤",
			nshortparallel: "∦",
			nsim: "≁",
			nsime: "≄",
			nsimeq: "≄",
			nsmid: "∤",
			nspar: "∦",
			nsqsube: "⋢",
			nsqsupe: "⋣",
			nsub: "⊄",
			nsubE: "⫅̸",
			nsube: "⊈",
			nsubset: "⊂⃒",
			nsubseteq: "⊈",
			nsubseteqq: "⫅̸",
			nsucc: "⊁",
			nsucceq: "⪰̸",
			nsup: "⊅",
			nsupE: "⫆̸",
			nsupe: "⊉",
			nsupset: "⊃⃒",
			nsupseteq: "⊉",
			nsupseteqq: "⫆̸",
			ntgl: "≹",
			Ntilde: "Ñ",
			ntilde: "ñ",
			ntlg: "≸",
			ntriangleleft: "⋪",
			ntrianglelefteq: "⋬",
			ntriangleright: "⋫",
			ntrianglerighteq: "⋭",
			Nu: "Ν",
			nu: "ν",
			num: "#",
			numero: "№",
			numsp: " ",
			nvap: "≍⃒",
			nVDash: "⊯",
			nVdash: "⊮",
			nvDash: "⊭",
			nvdash: "⊬",
			nvge: "≥⃒",
			nvgt: ">⃒",
			nvHarr: "⤄",
			nvinfin: "⧞",
			nvlArr: "⤂",
			nvle: "≤⃒",
			nvlt: "<⃒",
			nvltrie: "⊴⃒",
			nvrArr: "⤃",
			nvrtrie: "⊵⃒",
			nvsim: "∼⃒",
			nwarhk: "⤣",
			nwArr: "⇖",
			nwarr: "↖",
			nwarrow: "↖",
			nwnear: "⤧",
			Oacute: "Ó",
			oacute: "ó",
			oast: "⊛",
			ocir: "⊚",
			Ocirc: "Ô",
			ocirc: "ô",
			Ocy: "О",
			ocy: "о",
			odash: "⊝",
			Odblac: "Ő",
			odblac: "ő",
			odiv: "⨸",
			odot: "⊙",
			odsold: "⦼",
			OElig: "Œ",
			oelig: "œ",
			ofcir: "⦿",
			Ofr: "𝔒",
			ofr: "𝔬",
			ogon: "˛",
			Ograve: "Ò",
			ograve: "ò",
			ogt: "⧁",
			ohbar: "⦵",
			ohm: "Ω",
			oint: "∮",
			olarr: "↺",
			olcir: "⦾",
			olcross: "⦻",
			oline: "‾",
			olt: "⧀",
			Omacr: "Ō",
			omacr: "ō",
			Omega: "Ω",
			omega: "ω",
			Omicron: "Ο",
			omicron: "ο",
			omid: "⦶",
			ominus: "⊖",
			Oopf: "𝕆",
			oopf: "𝕠",
			opar: "⦷",
			OpenCurlyDoubleQuote: "“",
			OpenCurlyQuote: "‘",
			operp: "⦹",
			oplus: "⊕",
			Or: "⩔",
			or: "∨",
			orarr: "↻",
			ord: "⩝",
			order: "ℴ",
			orderof: "ℴ",
			ordf: "ª",
			ordm: "º",
			origof: "⊶",
			oror: "⩖",
			orslope: "⩗",
			orv: "⩛",
			oS: "Ⓢ",
			Oscr: "𝒪",
			oscr: "ℴ",
			Oslash: "Ø",
			oslash: "ø",
			osol: "⊘",
			Otilde: "Õ",
			otilde: "õ",
			Otimes: "⨷",
			otimes: "⊗",
			otimesas: "⨶",
			Ouml: "Ö",
			ouml: "ö",
			ovbar: "⌽",
			OverBar: "‾",
			OverBrace: "⏞",
			OverBracket: "⎴",
			OverParenthesis: "⏜",
			par: "∥",
			para: "¶",
			parallel: "∥",
			parsim: "⫳",
			parsl: "⫽",
			part: "∂",
			PartialD: "∂",
			Pcy: "П",
			pcy: "п",
			percnt: "%",
			period: ".",
			permil: "‰",
			perp: "⊥",
			pertenk: "‱",
			Pfr: "𝔓",
			pfr: "𝔭",
			Phi: "Φ",
			phi: "φ",
			phiv: "ϕ",
			phmmat: "ℳ",
			phone: "☎",
			Pi: "Π",
			pi: "π",
			pitchfork: "⋔",
			piv: "ϖ",
			planck: "ℏ",
			planckh: "ℎ",
			plankv: "ℏ",
			plus: "+",
			plusacir: "⨣",
			plusb: "⊞",
			pluscir: "⨢",
			plusdo: "∔",
			plusdu: "⨥",
			pluse: "⩲",
			PlusMinus: "±",
			plusmn: "±",
			plussim: "⨦",
			plustwo: "⨧",
			pm: "±",
			Poincareplane: "ℌ",
			pointint: "⨕",
			Popf: "ℙ",
			popf: "𝕡",
			pound: "£",
			Pr: "⪻",
			pr: "≺",
			prap: "⪷",
			prcue: "≼",
			prE: "⪳",
			pre: "⪯",
			prec: "≺",
			precapprox: "⪷",
			preccurlyeq: "≼",
			Precedes: "≺",
			PrecedesEqual: "⪯",
			PrecedesSlantEqual: "≼",
			PrecedesTilde: "≾",
			preceq: "⪯",
			precnapprox: "⪹",
			precneqq: "⪵",
			precnsim: "⋨",
			precsim: "≾",
			Prime: "″",
			prime: "′",
			primes: "ℙ",
			prnap: "⪹",
			prnE: "⪵",
			prnsim: "⋨",
			prod: "∏",
			Product: "∏",
			profalar: "⌮",
			profline: "⌒",
			profsurf: "⌓",
			prop: "∝",
			Proportion: "∷",
			Proportional: "∝",
			propto: "∝",
			prsim: "≾",
			prurel: "⊰",
			Pscr: "𝒫",
			pscr: "𝓅",
			Psi: "Ψ",
			psi: "ψ",
			puncsp: " ",
			Qfr: "𝔔",
			qfr: "𝔮",
			qint: "⨌",
			Qopf: "ℚ",
			qopf: "𝕢",
			qprime: "⁗",
			Qscr: "𝒬",
			qscr: "𝓆",
			quaternions: "ℍ",
			quatint: "⨖",
			quest: "?",
			questeq: "≟",
			QUOT: "\"",
			quot: "\"",
			rAarr: "⇛",
			race: "∽̱",
			Racute: "Ŕ",
			racute: "ŕ",
			radic: "√",
			raemptyv: "⦳",
			Rang: "⟫",
			rang: "⟩",
			rangd: "⦒",
			range: "⦥",
			rangle: "⟩",
			raquo: "»",
			Rarr: "↠",
			rArr: "⇒",
			rarr: "→",
			rarrap: "⥵",
			rarrb: "⇥",
			rarrbfs: "⤠",
			rarrc: "⤳",
			rarrfs: "⤞",
			rarrhk: "↪",
			rarrlp: "↬",
			rarrpl: "⥅",
			rarrsim: "⥴",
			Rarrtl: "⤖",
			rarrtl: "↣",
			rarrw: "↝",
			rAtail: "⤜",
			ratail: "⤚",
			ratio: "∶",
			rationals: "ℚ",
			RBarr: "⤐",
			rBarr: "⤏",
			rbarr: "⤍",
			rbbrk: "❳",
			rbrace: "}",
			rbrack: "]",
			rbrke: "⦌",
			rbrksld: "⦎",
			rbrkslu: "⦐",
			Rcaron: "Ř",
			rcaron: "ř",
			Rcedil: "Ŗ",
			rcedil: "ŗ",
			rceil: "⌉",
			rcub: "}",
			Rcy: "Р",
			rcy: "р",
			rdca: "⤷",
			rdldhar: "⥩",
			rdquo: "”",
			rdquor: "”",
			rdsh: "↳",
			Re: "ℜ",
			real: "ℜ",
			realine: "ℛ",
			realpart: "ℜ",
			reals: "ℝ",
			rect: "▭",
			REG: "®",
			reg: "®",
			ReverseElement: "∋",
			ReverseEquilibrium: "⇋",
			ReverseUpEquilibrium: "⥯",
			rfisht: "⥽",
			rfloor: "⌋",
			Rfr: "ℜ",
			rfr: "𝔯",
			rHar: "⥤",
			rhard: "⇁",
			rharu: "⇀",
			rharul: "⥬",
			Rho: "Ρ",
			rho: "ρ",
			rhov: "ϱ",
			RightAngleBracket: "⟩",
			RightArrow: "→",
			Rightarrow: "⇒",
			rightarrow: "→",
			RightArrowBar: "⇥",
			RightArrowLeftArrow: "⇄",
			rightarrowtail: "↣",
			RightCeiling: "⌉",
			RightDoubleBracket: "⟧",
			RightDownTeeVector: "⥝",
			RightDownVector: "⇂",
			RightDownVectorBar: "⥕",
			RightFloor: "⌋",
			rightharpoondown: "⇁",
			rightharpoonup: "⇀",
			rightleftarrows: "⇄",
			rightleftharpoons: "⇌",
			rightrightarrows: "⇉",
			rightsquigarrow: "↝",
			RightTee: "⊢",
			RightTeeArrow: "↦",
			RightTeeVector: "⥛",
			rightthreetimes: "⋌",
			RightTriangle: "⊳",
			RightTriangleBar: "⧐",
			RightTriangleEqual: "⊵",
			RightUpDownVector: "⥏",
			RightUpTeeVector: "⥜",
			RightUpVector: "↾",
			RightUpVectorBar: "⥔",
			RightVector: "⇀",
			RightVectorBar: "⥓",
			ring: "˚",
			risingdotseq: "≓",
			rlarr: "⇄",
			rlhar: "⇌",
			rlm: "‏",
			rmoust: "⎱",
			rmoustache: "⎱",
			rnmid: "⫮",
			roang: "⟭",
			roarr: "⇾",
			robrk: "⟧",
			ropar: "⦆",
			Ropf: "ℝ",
			ropf: "𝕣",
			roplus: "⨮",
			rotimes: "⨵",
			RoundImplies: "⥰",
			rpar: ")",
			rpargt: "⦔",
			rppolint: "⨒",
			rrarr: "⇉",
			Rrightarrow: "⇛",
			rsaquo: "›",
			Rscr: "ℛ",
			rscr: "𝓇",
			Rsh: "↱",
			rsh: "↱",
			rsqb: "]",
			rsquo: "’",
			rsquor: "’",
			rthree: "⋌",
			rtimes: "⋊",
			rtri: "▹",
			rtrie: "⊵",
			rtrif: "▸",
			rtriltri: "⧎",
			RuleDelayed: "⧴",
			ruluhar: "⥨",
			rx: "℞",
			Sacute: "Ś",
			sacute: "ś",
			sbquo: "‚",
			Sc: "⪼",
			sc: "≻",
			scap: "⪸",
			Scaron: "Š",
			scaron: "š",
			sccue: "≽",
			scE: "⪴",
			sce: "⪰",
			Scedil: "Ş",
			scedil: "ş",
			Scirc: "Ŝ",
			scirc: "ŝ",
			scnap: "⪺",
			scnE: "⪶",
			scnsim: "⋩",
			scpolint: "⨓",
			scsim: "≿",
			Scy: "С",
			scy: "с",
			sdot: "⋅",
			sdotb: "⊡",
			sdote: "⩦",
			searhk: "⤥",
			seArr: "⇘",
			searr: "↘",
			searrow: "↘",
			sect: "§",
			semi: ";",
			seswar: "⤩",
			setminus: "∖",
			setmn: "∖",
			sext: "✶",
			Sfr: "𝔖",
			sfr: "𝔰",
			sfrown: "⌢",
			sharp: "♯",
			SHCHcy: "Щ",
			shchcy: "щ",
			SHcy: "Ш",
			shcy: "ш",
			ShortDownArrow: "↓",
			ShortLeftArrow: "←",
			shortmid: "∣",
			shortparallel: "∥",
			ShortRightArrow: "→",
			ShortUpArrow: "↑",
			shy: "­",
			Sigma: "Σ",
			sigma: "σ",
			sigmaf: "ς",
			sigmav: "ς",
			sim: "∼",
			simdot: "⩪",
			sime: "≃",
			simeq: "≃",
			simg: "⪞",
			simgE: "⪠",
			siml: "⪝",
			simlE: "⪟",
			simne: "≆",
			simplus: "⨤",
			simrarr: "⥲",
			slarr: "←",
			SmallCircle: "∘",
			smallsetminus: "∖",
			smashp: "⨳",
			smeparsl: "⧤",
			smid: "∣",
			smile: "⌣",
			smt: "⪪",
			smte: "⪬",
			smtes: "⪬︀",
			SOFTcy: "Ь",
			softcy: "ь",
			sol: "/",
			solb: "⧄",
			solbar: "⌿",
			Sopf: "𝕊",
			sopf: "𝕤",
			spades: "♠",
			spadesuit: "♠",
			spar: "∥",
			sqcap: "⊓",
			sqcaps: "⊓︀",
			sqcup: "⊔",
			sqcups: "⊔︀",
			Sqrt: "√",
			sqsub: "⊏",
			sqsube: "⊑",
			sqsubset: "⊏",
			sqsubseteq: "⊑",
			sqsup: "⊐",
			sqsupe: "⊒",
			sqsupset: "⊐",
			sqsupseteq: "⊒",
			squ: "□",
			Square: "□",
			square: "□",
			SquareIntersection: "⊓",
			SquareSubset: "⊏",
			SquareSubsetEqual: "⊑",
			SquareSuperset: "⊐",
			SquareSupersetEqual: "⊒",
			SquareUnion: "⊔",
			squarf: "▪",
			squf: "▪",
			srarr: "→",
			Sscr: "𝒮",
			sscr: "𝓈",
			ssetmn: "∖",
			ssmile: "⌣",
			sstarf: "⋆",
			Star: "⋆",
			star: "☆",
			starf: "★",
			straightepsilon: "ϵ",
			straightphi: "ϕ",
			strns: "¯",
			Sub: "⋐",
			sub: "⊂",
			subdot: "⪽",
			subE: "⫅",
			sube: "⊆",
			subedot: "⫃",
			submult: "⫁",
			subnE: "⫋",
			subne: "⊊",
			subplus: "⪿",
			subrarr: "⥹",
			Subset: "⋐",
			subset: "⊂",
			subseteq: "⊆",
			subseteqq: "⫅",
			SubsetEqual: "⊆",
			subsetneq: "⊊",
			subsetneqq: "⫋",
			subsim: "⫇",
			subsub: "⫕",
			subsup: "⫓",
			succ: "≻",
			succapprox: "⪸",
			succcurlyeq: "≽",
			Succeeds: "≻",
			SucceedsEqual: "⪰",
			SucceedsSlantEqual: "≽",
			SucceedsTilde: "≿",
			succeq: "⪰",
			succnapprox: "⪺",
			succneqq: "⪶",
			succnsim: "⋩",
			succsim: "≿",
			SuchThat: "∋",
			Sum: "∑",
			sum: "∑",
			sung: "♪",
			Sup: "⋑",
			sup: "⊃",
			sup1: "¹",
			sup2: "²",
			sup3: "³",
			supdot: "⪾",
			supdsub: "⫘",
			supE: "⫆",
			supe: "⊇",
			supedot: "⫄",
			Superset: "⊃",
			SupersetEqual: "⊇",
			suphsol: "⟉",
			suphsub: "⫗",
			suplarr: "⥻",
			supmult: "⫂",
			supnE: "⫌",
			supne: "⊋",
			supplus: "⫀",
			Supset: "⋑",
			supset: "⊃",
			supseteq: "⊇",
			supseteqq: "⫆",
			supsetneq: "⊋",
			supsetneqq: "⫌",
			supsim: "⫈",
			supsub: "⫔",
			supsup: "⫖",
			swarhk: "⤦",
			swArr: "⇙",
			swarr: "↙",
			swarrow: "↙",
			swnwar: "⤪",
			szlig: "ß",
			Tab: "	",
			target: "⌖",
			Tau: "Τ",
			tau: "τ",
			tbrk: "⎴",
			Tcaron: "Ť",
			tcaron: "ť",
			Tcedil: "Ţ",
			tcedil: "ţ",
			Tcy: "Т",
			tcy: "т",
			tdot: "⃛",
			telrec: "⌕",
			Tfr: "𝔗",
			tfr: "𝔱",
			there4: "∴",
			Therefore: "∴",
			therefore: "∴",
			Theta: "Θ",
			theta: "θ",
			thetasym: "ϑ",
			thetav: "ϑ",
			thickapprox: "≈",
			thicksim: "∼",
			ThickSpace: "  ",
			thinsp: " ",
			ThinSpace: " ",
			thkap: "≈",
			thksim: "∼",
			THORN: "Þ",
			thorn: "þ",
			Tilde: "∼",
			tilde: "˜",
			TildeEqual: "≃",
			TildeFullEqual: "≅",
			TildeTilde: "≈",
			times: "×",
			timesb: "⊠",
			timesbar: "⨱",
			timesd: "⨰",
			tint: "∭",
			toea: "⤨",
			top: "⊤",
			topbot: "⌶",
			topcir: "⫱",
			Topf: "𝕋",
			topf: "𝕥",
			topfork: "⫚",
			tosa: "⤩",
			tprime: "‴",
			TRADE: "™",
			trade: "™",
			triangle: "▵",
			triangledown: "▿",
			triangleleft: "◃",
			trianglelefteq: "⊴",
			triangleq: "≜",
			triangleright: "▹",
			trianglerighteq: "⊵",
			tridot: "◬",
			trie: "≜",
			triminus: "⨺",
			TripleDot: "⃛",
			triplus: "⨹",
			trisb: "⧍",
			tritime: "⨻",
			trpezium: "⏢",
			Tscr: "𝒯",
			tscr: "𝓉",
			TScy: "Ц",
			tscy: "ц",
			TSHcy: "Ћ",
			tshcy: "ћ",
			Tstrok: "Ŧ",
			tstrok: "ŧ",
			twixt: "≬",
			twoheadleftarrow: "↞",
			twoheadrightarrow: "↠",
			Uacute: "Ú",
			uacute: "ú",
			Uarr: "↟",
			uArr: "⇑",
			uarr: "↑",
			Uarrocir: "⥉",
			Ubrcy: "Ў",
			ubrcy: "ў",
			Ubreve: "Ŭ",
			ubreve: "ŭ",
			Ucirc: "Û",
			ucirc: "û",
			Ucy: "У",
			ucy: "у",
			udarr: "⇅",
			Udblac: "Ű",
			udblac: "ű",
			udhar: "⥮",
			ufisht: "⥾",
			Ufr: "𝔘",
			ufr: "𝔲",
			Ugrave: "Ù",
			ugrave: "ù",
			uHar: "⥣",
			uharl: "↿",
			uharr: "↾",
			uhblk: "▀",
			ulcorn: "⌜",
			ulcorner: "⌜",
			ulcrop: "⌏",
			ultri: "◸",
			Umacr: "Ū",
			umacr: "ū",
			uml: "¨",
			UnderBar: "_",
			UnderBrace: "⏟",
			UnderBracket: "⎵",
			UnderParenthesis: "⏝",
			Union: "⋃",
			UnionPlus: "⊎",
			Uogon: "Ų",
			uogon: "ų",
			Uopf: "𝕌",
			uopf: "𝕦",
			UpArrow: "↑",
			Uparrow: "⇑",
			uparrow: "↑",
			UpArrowBar: "⤒",
			UpArrowDownArrow: "⇅",
			UpDownArrow: "↕",
			Updownarrow: "⇕",
			updownarrow: "↕",
			UpEquilibrium: "⥮",
			upharpoonleft: "↿",
			upharpoonright: "↾",
			uplus: "⊎",
			UpperLeftArrow: "↖",
			UpperRightArrow: "↗",
			Upsi: "ϒ",
			upsi: "υ",
			upsih: "ϒ",
			Upsilon: "Υ",
			upsilon: "υ",
			UpTee: "⊥",
			UpTeeArrow: "↥",
			upuparrows: "⇈",
			urcorn: "⌝",
			urcorner: "⌝",
			urcrop: "⌎",
			Uring: "Ů",
			uring: "ů",
			urtri: "◹",
			Uscr: "𝒰",
			uscr: "𝓊",
			utdot: "⋰",
			Utilde: "Ũ",
			utilde: "ũ",
			utri: "▵",
			utrif: "▴",
			uuarr: "⇈",
			Uuml: "Ü",
			uuml: "ü",
			uwangle: "⦧",
			vangrt: "⦜",
			varepsilon: "ϵ",
			varkappa: "ϰ",
			varnothing: "∅",
			varphi: "ϕ",
			varpi: "ϖ",
			varpropto: "∝",
			vArr: "⇕",
			varr: "↕",
			varrho: "ϱ",
			varsigma: "ς",
			varsubsetneq: "⊊︀",
			varsubsetneqq: "⫋︀",
			varsupsetneq: "⊋︀",
			varsupsetneqq: "⫌︀",
			vartheta: "ϑ",
			vartriangleleft: "⊲",
			vartriangleright: "⊳",
			Vbar: "⫫",
			vBar: "⫨",
			vBarv: "⫩",
			Vcy: "В",
			vcy: "в",
			VDash: "⊫",
			Vdash: "⊩",
			vDash: "⊨",
			vdash: "⊢",
			Vdashl: "⫦",
			Vee: "⋁",
			vee: "∨",
			veebar: "⊻",
			veeeq: "≚",
			vellip: "⋮",
			Verbar: "‖",
			verbar: "|",
			Vert: "‖",
			vert: "|",
			VerticalBar: "∣",
			VerticalLine: "|",
			VerticalSeparator: "❘",
			VerticalTilde: "≀",
			VeryThinSpace: " ",
			Vfr: "𝔙",
			vfr: "𝔳",
			vltri: "⊲",
			vnsub: "⊂⃒",
			vnsup: "⊃⃒",
			Vopf: "𝕍",
			vopf: "𝕧",
			vprop: "∝",
			vrtri: "⊳",
			Vscr: "𝒱",
			vscr: "𝓋",
			vsubnE: "⫋︀",
			vsubne: "⊊︀",
			vsupnE: "⫌︀",
			vsupne: "⊋︀",
			Vvdash: "⊪",
			vzigzag: "⦚",
			Wcirc: "Ŵ",
			wcirc: "ŵ",
			wedbar: "⩟",
			Wedge: "⋀",
			wedge: "∧",
			wedgeq: "≙",
			weierp: "℘",
			Wfr: "𝔚",
			wfr: "𝔴",
			Wopf: "𝕎",
			wopf: "𝕨",
			wp: "℘",
			wr: "≀",
			wreath: "≀",
			Wscr: "𝒲",
			wscr: "𝓌",
			xcap: "⋂",
			xcirc: "◯",
			xcup: "⋃",
			xdtri: "▽",
			Xfr: "𝔛",
			xfr: "𝔵",
			xhArr: "⟺",
			xharr: "⟷",
			Xi: "Ξ",
			xi: "ξ",
			xlArr: "⟸",
			xlarr: "⟵",
			xmap: "⟼",
			xnis: "⋻",
			xodot: "⨀",
			Xopf: "𝕏",
			xopf: "𝕩",
			xoplus: "⨁",
			xotime: "⨂",
			xrArr: "⟹",
			xrarr: "⟶",
			Xscr: "𝒳",
			xscr: "𝓍",
			xsqcup: "⨆",
			xuplus: "⨄",
			xutri: "△",
			xvee: "⋁",
			xwedge: "⋀",
			Yacute: "Ý",
			yacute: "ý",
			YAcy: "Я",
			yacy: "я",
			Ycirc: "Ŷ",
			ycirc: "ŷ",
			Ycy: "Ы",
			ycy: "ы",
			yen: "¥",
			Yfr: "𝔜",
			yfr: "𝔶",
			YIcy: "Ї",
			yicy: "ї",
			Yopf: "𝕐",
			yopf: "𝕪",
			Yscr: "𝒴",
			yscr: "𝓎",
			YUcy: "Ю",
			yucy: "ю",
			Yuml: "Ÿ",
			yuml: "ÿ",
			Zacute: "Ź",
			zacute: "ź",
			Zcaron: "Ž",
			zcaron: "ž",
			Zcy: "З",
			zcy: "з",
			Zdot: "Ż",
			zdot: "ż",
			zeetrf: "ℨ",
			ZeroWidthSpace: "​",
			Zeta: "Ζ",
			zeta: "ζ",
			Zfr: "ℨ",
			zfr: "𝔷",
			ZHcy: "Ж",
			zhcy: "ж",
			zigrarr: "⇝",
			Zopf: "ℤ",
			zopf: "𝕫",
			Zscr: "𝒵",
			zscr: "𝓏",
			zwj: "‍",
			zwnj: "‌"
		}), e.entityMap = e.HTML_ENTITIES;
	}), h = a((e) => {
		var t = c(), n = d(), r = u(), o = t.isHTMLEscapableRawTextElement, i = t.isHTMLMimeType, a = t.isHTMLRawTextElement, s = t.hasOwn, l = t.NAMESPACE, p = r.ParseError, f = r.DOMException;
		function h() {}
		h.prototype = { parse: function(e, r, o) {
			var a = this.domBuilder;
			a.startDocument(), function(e, t) {
				for (var n in e) s(e, n) && (t[n] = e[n]);
			}(r, r = Object.create(null)), function(e, r, o, a, l) {
				var c = i(a.mimeType);
				e.indexOf(n.UNICODE_REPLACEMENT_CHARACTER) >= 0 && l.warning("Unicode replacement character detected, source encoding issues?");
				function u(e) {
					if (e > 65535) {
						var t = 55296 + ((e -= 65536) >> 10), n = 56320 + (1023 & e);
						return String.fromCharCode(t, n);
					}
					return String.fromCharCode(e);
				}
				function d(e) {
					var t = ";" === e[e.length - 1] ? e : e + ";";
					if (!c && t !== e) return l.error("EntityRef: expecting ;"), e;
					var r = n.Reference.exec(t);
					if (!r || r[0].length !== t.length) return l.error("entity not matching Reference production: " + e), e;
					var i = t.slice(1, -1);
					return s(o, i) ? o[i] : "#" === i.charAt(0) ? u(parseInt(i.substring(1).replace("x", "0x"))) : (l.error("entity not found:" + e), e);
				}
				function h(t) {
					if (t > A) {
						var n = e.substring(A, t).replace(m, d);
						T && I(A), a.characters(n, 0, t - A), A = t;
					}
				}
				var y = 0, E = 0, k = /\r\n?|\n|$/g, T = a.locator;
				function I(t, n) {
					for (; t >= E && (n = k.exec(e));) y = E, E = n.index + n[0].length, T.lineNumber++;
					T.columnNumber = t - y + 1;
				}
				var _ = [{ currentNSMap: r }], C = [], A = 0;
				for (;;) {
					try {
						var R = e.indexOf("<", A);
						if (R < 0) {
							if (!c && C.length > 0) return l.fatalError("unclosed xml tag(s): " + C.join(", "));
							if (!e.substring(A).match(/^\s*$/)) {
								var $ = a.doc, D = $.createTextNode(e.substring(A));
								if ($.documentElement) return l.error("Extra content at the end of the document");
								$.appendChild(D), a.currentElement = D;
							}
							return;
						}
						if (R > A) {
							var P = e.substring(A, R);
							c || 0 !== C.length || (P = P.replace(new RegExp(n.S_OPT.source, "g"), "")) && l.error("Unexpected content outside root element: '" + P + "'"), h(R);
						}
						switch (e.charAt(R + 1)) {
							case "/":
								var M = e.indexOf(">", R + 2), F = e.substring(R + 2, M > 0 ? M : void 0);
								if (!F) return l.fatalError("end tag name missing");
								var O = n.reg("^", n.QName_group, n.S_OPT, "$"), L = M > 0 && O.exec(F);
								if (!L) {
									var B = M > 0 && n.reg("^", n.QName_group).exec(F);
									if (c && B) l.warning("end tag name contains invalid trailing characters: \"" + F + "\""), L = B;
									else {
										if (!B || !new RegExp(O.source, O.flags + "m").test(F)) return l.fatalError("end tag name contains invalid characters: \"" + F + "\"");
										l.error("end tag name is followed by a line break and trailing content: \"" + F + "\""), L = B;
									}
								}
								if (!a.currentElement && !a.doc.documentElement) return;
								var U = C[C.length - 1] || a.currentElement.tagName || a.doc.documentElement.tagName || "";
								if (U !== L[1]) {
									var z = L[1].toLowerCase();
									if (!c || U.toLowerCase() !== z) return l.fatalError("Opening and ending tag mismatch: \"" + U + "\" != \"" + F + "\"");
								}
								var H = _.pop();
								C.pop();
								var j = H.localNSMap;
								if (a.endElement(H.uri, H.localName, U), j) for (var q in j) s(j, q) && a.endPrefixMapping(q);
								M++;
								break;
							case "?":
								T && I(R), M = S(e, R, a, l);
								break;
							case "!":
								T && I(R), M = x(e, R, a, l, c);
								break;
							default:
								T && I(R);
								var W = new N(), G = _[_.length - 1].currentNSMap, V = (M = w(e, R, W, G, d, l, c), W.length);
								if (W.closed || (c && t.isHTMLVoidElement(W.tagName) ? W.closed = !0 : C.push(W.tagName)), T && V) {
									for (var X = g(T, {}), Z = 0; Z < V; Z++) {
										var Y = W[Z];
										I(Y.offset), Y.locator = g(T, {});
									}
									a.locator = X, b(W, a, G) && _.push(W), a.locator = T;
								} else b(W, a, G) && _.push(W);
								c && !W.closed ? M = v(e, M, W.tagName, d, a) : M++;
						}
					} catch (Q) {
						if (Q instanceof p) throw Q;
						if (Q instanceof f) return l.fatalError("Error constructing the DOM: " + Q.name + ": " + Q.message, Q);
						l.error("element parse error: " + Q), M = -1;
					}
					M > A ? A = M : h(Math.max(R, A) + 1);
				}
			}(e, r, o, a, this.errorHandler), a.endDocument();
		} };
		var m = /&#?\w+;?/g;
		function g(e, t) {
			return t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber, t;
		}
		function w(e, t, n, r, o, i, a) {
			function l(e, t, r) {
				return s(n.attributeNames, e) ? i.fatalError("Attribute " + e + " redefined") : !a && t.indexOf("<") >= 0 ? i.fatalError("Unescaped '<' not allowed in attributes values") : void n.addValue(e, t.replace(/[\t\n\r]/g, " ").replace(m, o), r);
			}
			for (var c, u = ++t, d = 0;;) {
				var p = e.charAt(u);
				if (0 === d && "<" === p) throw new Error("unexpected < in tag name: " + e.slice(t, u));
				switch (p) {
					case "=":
						if (1 === d) c = e.slice(t, u), d = 3;
						else {
							if (2 !== d) throw new Error("attribute equal must after attrName");
							d = 3;
						}
						break;
					case "'":
					case "\"":
						if (3 === d || 1 === d) {
							if (1 === d && (i.warning("attribute value must after \"=\""), c = e.slice(t, u)), t = u + 1, !((u = e.indexOf(p, t)) > 0)) throw new Error("attribute value no end '" + p + "' match");
							l(c, f = e.slice(t, u), t - 1), d = 5;
						} else {
							if (4 != d) throw new Error("attribute value must after \"=\"");
							l(c, f = e.slice(t, u), t), i.warning("attribute \"" + c + "\" missed start quot(" + p + ")!!"), t = u + 1, d = 5;
						}
						break;
					case "/":
						switch (d) {
							case 0: n.setTagName(e.slice(t, u));
							case 5:
							case 6:
							case 7: d = 7, n.closed = !0;
							case 4:
							case 1: break;
							case 2:
								n.closed = !0;
								break;
							default: throw new Error("attribute invalid close char('/')");
						}
						break;
					case "": return i.error("unexpected end of input"), 0 == d && n.setTagName(e.slice(t, u)), u;
					case ">":
						switch (d) {
							case 0: n.setTagName(e.slice(t, u));
							case 5:
							case 6:
							case 7: break;
							case 4:
							case 1: "/" === (f = e.slice(t, u)).slice(-1) && (n.closed = !0, f = f.slice(0, -1));
							case 2:
								2 === d && (f = c), 4 == d ? (i.warning("attribute \"" + f + "\" missed quot(\")!"), l(c, f, t)) : (a || i.warning("attribute \"" + f + "\" missed value!! \"" + f + "\" instead!!"), l(f, f, t));
								break;
							case 3: if (!a) return i.fatalError("AttValue: ' or \" expected");
						}
						return u;
					case "": p = " ";
					default: if (p <= " ") switch (d) {
						case 0:
							n.setTagName(e.slice(t, u)), d = 6;
							break;
						case 1:
							c = e.slice(t, u), d = 2;
							break;
						case 4:
							var f = e.slice(t, u);
							i.warning("attribute \"" + f + "\" missed quot(\")!!"), l(c, f, t);
						case 5: d = 6;
					}
					else switch (d) {
						case 2:
							a || i.warning("attribute \"" + c + "\" missed value!! \"" + c + "\" instead2!!"), l(c, c, t), t = u, d = 1;
							break;
						case 5: i.warning("attribute space is required\"" + c + "\"!!");
						case 6:
							d = 1, t = u;
							break;
						case 3:
							d = 4, t = u;
							break;
						case 7: throw new Error("elements closed character '/' and '>' must be connected to");
					}
				}
				u++;
			}
		}
		function b(e, t, n) {
			for (var r = e.tagName, o = null, i = e.length; i--;) {
				var a = e[i], c = a.qName, u = a.value;
				if ((h = c.indexOf(":")) > 0) var d = a.prefix = c.slice(0, h), p = c.slice(h + 1), f = "xmlns" === d && p;
				else p = c, d = null, f = "xmlns" === c && "";
				a.localName = p, !1 !== f && (null == o && (o = Object.create(null), n = Object.create(n)), n[f] = o[f] = u, a.uri = l.XMLNS, t.startPrefixMapping(f, u));
			}
			for (i = e.length; i--;) (a = e[i]).prefix && ("xml" === a.prefix && (a.uri = l.XML), "xmlns" !== a.prefix && (a.uri = n[a.prefix]));
			var h;
			(h = r.indexOf(":")) > 0 ? (d = e.prefix = r.slice(0, h), p = e.localName = r.slice(h + 1)) : (d = null, p = e.localName = r);
			var m = e.uri = n[d || ""];
			if (t.startElement(m, p, r, e), !e.closed) return e.currentNSMap = n, e.localNSMap = o, !0;
			if (t.endElement(m, p, r), o) for (d in o) s(o, d) && t.endPrefixMapping(d);
		}
		function v(e, t, n, r, i) {
			var s = o(n);
			if (s || a(n)) {
				var l = new RegExp("</" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ">", "ig");
				l.lastIndex = t;
				var c = l.exec(e), u = c ? c.index : -1;
				if (u < 0) return t + 1;
				var d = e.substring(t + 1, u);
				return s && (d = d.replace(m, r)), i.characters(d, 0, d.length), u;
			}
			return t + 1;
		}
		function y(e, t) {
			var r = t;
			function o(t) {
				return t = t || 0, e.charAt(r + t);
			}
			function i(e) {
				r += e = e || 1;
			}
			function a() {
				return e.substring(r);
			}
			return {
				char: o,
				getIndex: function() {
					return r;
				},
				getMatch: function(e) {
					var t = n.reg("^", e).exec(a());
					return t ? (i(t[0].length), t[0]) : null;
				},
				getSource: function() {
					return e;
				},
				skip: i,
				skipBlanks: function() {
					for (var t = 0; r < e.length;) {
						var n = o();
						if (" " !== n && "\n" !== n && "	" !== n && "\r" !== n) return t;
						t++, i();
					}
					return -1;
				},
				substringFromIndex: a,
				substringStartsWith: function(t) {
					return e.substring(r, r + t.length) === t;
				},
				substringStartsWithCaseInsensitive: function(t) {
					return e.substring(r, r + t.length).toUpperCase() === t.toUpperCase();
				}
			};
		}
		function x(e, t, r, o, i) {
			var a = y(e, t);
			switch (i ? a.char(2).toUpperCase() : a.char(2)) {
				case "-":
					var s = a.getMatch(n.Comment);
					return s ? (r.comment(s, n.COMMENT_START.length, s.length - n.COMMENT_START.length - n.COMMENT_END.length), a.getIndex()) : o.fatalError("comment is not well-formed at position " + a.getIndex());
				case "[":
					var l = a.getMatch(n.CDSect);
					return l ? i || r.currentElement ? (r.startCDATA(), r.characters(l, n.CDATA_START.length, l.length - n.CDATA_START.length - n.CDATA_END.length), r.endCDATA(), a.getIndex()) : o.fatalError("CDATA outside of element") : o.fatalError("Invalid CDATA starting at position " + t);
				case "D":
					if (r.doc && r.doc.documentElement) return o.fatalError("Doctype not allowed inside or after documentElement at position " + a.getIndex());
					if (i ? !a.substringStartsWithCaseInsensitive(n.DOCTYPE_DECL_START) : !a.substringStartsWith(n.DOCTYPE_DECL_START)) return o.fatalError("Expected " + n.DOCTYPE_DECL_START + " at position " + a.getIndex());
					if (a.skip(n.DOCTYPE_DECL_START.length), a.skipBlanks() < 1) return o.fatalError("Expected whitespace after " + n.DOCTYPE_DECL_START + " at position " + a.getIndex());
					var c = {
						name: void 0,
						publicId: void 0,
						systemId: void 0,
						internalSubset: void 0
					};
					if (c.name = a.getMatch(n.Name), !c.name) return o.fatalError("doctype name missing or contains unexpected characters at position " + a.getIndex());
					if (i && "html" !== c.name.toLowerCase() && o.warning("Unexpected DOCTYPE in HTML document at position " + a.getIndex()), a.skipBlanks(), a.substringStartsWith(n.PUBLIC) || a.substringStartsWith(n.SYSTEM)) {
						var u = n.ExternalID_match.exec(a.substringFromIndex());
						if (!u) return o.fatalError("doctype external id is not well-formed at position " + a.getIndex());
						void 0 !== u.groups.SystemLiteralOnly ? c.systemId = u.groups.SystemLiteralOnly : (c.systemId = u.groups.SystemLiteral, c.publicId = u.groups.PubidLiteral), a.skip(u[0].length);
					} else if (i && a.substringStartsWithCaseInsensitive(n.SYSTEM)) {
						if (a.skip(n.SYSTEM.length), a.skipBlanks() < 1) return o.fatalError("Expected whitespace after " + n.SYSTEM + " at position " + a.getIndex());
						if (c.systemId = a.getMatch(n.ABOUT_LEGACY_COMPAT_SystemLiteral), !c.systemId) return o.fatalError("Expected " + n.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + n.SYSTEM + " at position " + a.getIndex());
					}
					return i && c.systemId && !n.ABOUT_LEGACY_COMPAT_SystemLiteral.test(c.systemId) && o.warning("Unexpected doctype.systemId in HTML document at position " + a.getIndex()), i || (a.skipBlanks(), c.internalSubset = function(e, t) {
						function r(e, t) {
							var r = n.PI.exec(e.substringFromIndex());
							return r ? "xml" === r[1].toLowerCase() ? t.fatalError("xml declaration is only allowed at the start of the document, but found at position " + e.getIndex()) : (e.skip(r[0].length), r[0]) : t.fatalError("processing instruction is not well-formed at position " + e.getIndex());
						}
						var o = e.getSource();
						if ("[" === e.char()) {
							e.skip(1);
							for (var i = e.getIndex(); e.getIndex() < o.length;) {
								if (e.skipBlanks(), "]" === e.char()) {
									var a = o.substring(i, e.getIndex());
									return e.skip(1), a;
								}
								var s = null;
								if ("<" === e.char() && "!" === e.char(1)) switch (e.char(2)) {
									case "E":
										"L" === e.char(3) ? s = e.getMatch(n.elementdecl) : "N" === e.char(3) && (s = e.getMatch(n.EntityDecl));
										break;
									case "A":
										s = e.getMatch(n.AttlistDecl);
										break;
									case "N":
										s = e.getMatch(n.NotationDecl);
										break;
									case "-": s = e.getMatch(n.Comment);
								}
								else if ("<" === e.char() && "?" === e.char(1)) s = r(e, t);
								else {
									if ("%" !== e.char()) return t.fatalError("Error detected in Markup declaration");
									s = e.getMatch(n.PEReference);
								}
								if (!s) return t.fatalError("Error in internal subset at position " + e.getIndex());
							}
							return t.fatalError("doctype internal subset is not well-formed, missing ]");
						}
					}(a, o)), a.skipBlanks(), ">" !== a.char() ? o.fatalError("doctype not terminated with > at position " + a.getIndex()) : (a.skip(1), r.startDTD(c.name, c.publicId, c.systemId, c.internalSubset), r.endDTD(), a.getIndex());
				default: return o.fatalError("Not well-formed XML starting with \"<!\" at position " + t);
			}
		}
		function S(e, t, r, o) {
			var i = e.substring(t).match(n.PI);
			if (!i) return o.fatalError("Invalid processing instruction starting at position " + t);
			if ("xml" === i[1].toLowerCase()) {
				if (t > 0) return o.fatalError("processing instruction at position " + t + " is an xml declaration which is only at the start of the document");
				if (!n.XMLDecl.test(e.substring(t))) return o.fatalError("xml declaration is not well-formed");
			}
			return r.processingInstruction(i[1], i[2]), t + i[0].length;
		}
		function N() {
			this.attributeNames = Object.create(null);
		}
		N.prototype = {
			setTagName: function(e) {
				if (!n.QName_exact.test(e)) throw new Error("invalid tagName:" + e);
				this.tagName = e;
			},
			addValue: function(e, t, r) {
				if (!n.QName_exact.test(e)) throw new Error("invalid attribute:" + e);
				this.attributeNames[e] = this.length, this[this.length++] = {
					qName: e,
					value: t,
					offset: r
				};
			},
			length: 0,
			getLocalName: function(e) {
				return this[e].localName;
			},
			getLocator: function(e) {
				return this[e].locator;
			},
			getQName: function(e) {
				return this[e].qName;
			},
			getURI: function(e) {
				return this[e].uri;
			},
			getValue: function(e) {
				return this[e].value;
			}
		}, e.XMLReader = h, e.parseUtils = y, e.parseDoctypeCommentOrCData = x;
	}), m = a((e) => {
		var t = c(), n = p(), r = u(), o = f(), i = h(), a = n.DOMImplementation, s = t.hasDefaultHTMLNamespace, l = t.isHTMLMimeType, d = t.isValidMimeType, m = t.MIME_TYPE, g = t.NAMESPACE, w = r.ParseError, b = i.XMLReader;
		function v(e) {
			return e.replace(/\r[\n\u0085]/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
		}
		function y(e) {
			if (void 0 === (e = e || {}).locator && (e.locator = !0), this.assign = e.assign || t.assign, this.domHandler = e.domHandler || x, this.onError = e.onError || e.errorHandler, e.errorHandler && "function" != typeof e.errorHandler) throw new TypeError("errorHandler object is no longer supported, switch to onError!");
			e.errorHandler && e.errorHandler("warning", "The `errorHandler` option has been deprecated, use `onError` instead!", this), this.normalizeLineEndings = e.normalizeLineEndings || v, this.locator = !!e.locator, this.xmlns = this.assign(Object.create(null), e.xmlns);
		}
		function x(e) {
			var t = e || {};
			this.mimeType = t.mimeType || m.XML_APPLICATION, this.defaultNamespace = t.defaultNamespace || null, this.cdata = !1, this.currentElement = void 0, this.doc = void 0, this.locator = void 0, this.onError = t.onError;
		}
		function S(e, t) {
			t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber;
		}
		function N(e, t, n) {
			return "string" == typeof e ? e.substr(t, n) : e.length >= t + n || t ? new java.lang.String(e, t, n) + "" : e;
		}
		function E(e, t) {
			e.currentElement ? e.currentElement.appendChild(t) : e.doc.appendChild(t);
		}
		y.prototype.parseFromString = function(e, n) {
			if (!d(n)) throw new TypeError("DOMParser.parseFromString: the provided mimeType \"" + n + "\" is not valid.");
			var r = this.assign(Object.create(null), this.xmlns), i = o.XML_ENTITIES, a = r[""] || null;
			s(n) ? (i = o.HTML_ENTITIES, a = g.HTML) : n === m.XML_SVG_IMAGE && (a = g.SVG), r[""] = a, r.xml = r.xml || g.XML;
			var l = new this.domHandler({
				mimeType: n,
				defaultNamespace: a,
				onError: this.onError
			}), c = this.locator ? {} : void 0;
			this.locator && l.setDocumentLocator(c);
			var u = new b();
			return u.errorHandler = l, u.domBuilder = l, t.isHTMLMimeType(n) || "string" == typeof e || u.errorHandler.fatalError("source is not a string"), u.parse(this.normalizeLineEndings(String(e)), r, i), l.doc.documentElement || u.errorHandler.fatalError("missing root element"), l.doc;
		}, x.prototype = {
			startDocument: function() {
				var e = new a();
				this.doc = l(this.mimeType) ? e.createHTMLDocument(!1) : e.createDocument(this.defaultNamespace, "");
			},
			startElement: function(e, t, n, r) {
				var o = this.doc, i = o.createElementNS(e, n || t), a = r.length;
				E(this, i), this.currentElement = i, this.locator && S(this.locator, i);
				for (var s = 0; s < a; s++) {
					e = r.getURI(s);
					var l = r.getValue(s), c = (n = r.getQName(s), o.createAttributeNS(e, n));
					this.locator && S(r.getLocator(s), c), c.value = c.nodeValue = l, i.setAttributeNode(c);
				}
			},
			endElement: function(e, t, n) {
				this.currentElement = this.currentElement.parentNode;
			},
			startPrefixMapping: function(e, t) {},
			endPrefixMapping: function(e) {},
			processingInstruction: function(e, t) {
				var n = this.doc.createProcessingInstruction(e, t);
				this.locator && S(this.locator, n), E(this, n);
			},
			ignorableWhitespace: function(e, t, n) {},
			characters: function(e, t, n) {
				if (e = N.apply(this, arguments)) {
					if (this.cdata) var r = this.doc.createCDATASection(e);
					else r = this.doc.createTextNode(e);
					this.currentElement ? this.currentElement.appendChild(r) : /^\s*$/.test(e) && this.doc.appendChild(r), this.locator && S(this.locator, r);
				}
			},
			skippedEntity: function(e) {},
			endDocument: function() {
				this.doc.normalize();
			},
			setDocumentLocator: function(e) {
				e && (e.lineNumber = 0), this.locator = e;
			},
			comment: function(e, t, n) {
				e = N.apply(this, arguments);
				var r = this.doc.createComment(e);
				this.locator && S(this.locator, r), E(this, r);
			},
			startCDATA: function() {
				this.cdata = !0;
			},
			endCDATA: function() {
				this.cdata = !1;
			},
			startDTD: function(e, t, n, r) {
				var o = this.doc.implementation;
				if (o && o.createDocumentType) {
					var i = o.createDocumentType(e, t, n, r);
					this.locator && S(this.locator, i), E(this, i), this.doc.doctype = i;
				}
			},
			reportError: function(e, t) {
				if ("function" == typeof this.onError) try {
					this.onError(e, t, this);
				} catch (n) {
					throw new w("Reporting " + e + " \"" + t + "\" caused " + n, this.locator);
				}
				else console.error("[xmldom " + e + "]	" + t, function(e) {
					if (e) return "\n@#[line:" + e.lineNumber + ",col:" + e.columnNumber + "]";
				}(this.locator));
			},
			warning: function(e) {
				this.reportError("warning", e);
			},
			error: function(e) {
				this.reportError("error", e);
			},
			fatalError: function(e, t) {
				throw this.reportError("fatalError", e), new w(e, this.locator, t);
			}
		}, "endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g, function(e) {
			x.prototype[e] = function() {
				return null;
			};
		}), e.__DOMHandler = x, e.DOMParser = y, e.normalizeLineEndings = v, e.onErrorStopParsing = function(e) {
			if ("error" === e) throw "onErrorStopParsing";
		}, e.onWarningStopParsing = function() {
			throw "onWarningStopParsing";
		};
	}), g = a((e) => {
		var t = c();
		e.assign = t.assign, e.hasDefaultHTMLNamespace = t.hasDefaultHTMLNamespace, e.isHTMLMimeType = t.isHTMLMimeType, e.isValidMimeType = t.isValidMimeType, e.MIME_TYPE = t.MIME_TYPE, e.NAMESPACE = t.NAMESPACE;
		var n = u();
		e.DOMException = n.DOMException, e.DOMExceptionName = n.DOMExceptionName, e.ExceptionCode = n.ExceptionCode, e.ParseError = n.ParseError;
		var r = p();
		e.Attr = r.Attr, e.CDATASection = r.CDATASection, e.CharacterData = r.CharacterData, e.Comment = r.Comment, e.Document = r.Document, e.DocumentFragment = r.DocumentFragment, e.DocumentType = r.DocumentType, e.DOMImplementation = r.DOMImplementation, e.Element = r.Element, e.Entity = r.Entity, e.EntityReference = r.EntityReference, e.LiveNodeList = r.LiveNodeList, e.NamedNodeMap = r.NamedNodeMap, e.Node = r.Node, e.NodeList = r.NodeList, e.Notation = r.Notation, e.ProcessingInstruction = r.ProcessingInstruction, e.Text = r.Text, e.XMLSerializer = r.XMLSerializer;
		var o = m();
		e.DOMParser = o.DOMParser, e.normalizeLineEndings = o.normalizeLineEndings, e.onErrorStopParsing = o.onErrorStopParsing, e.onWarningStopParsing = o.onWarningStopParsing;
	}), w = s(l(), 1), b = g();
	const v = "_rels/.rels";
	function y(e) {
		return e.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
	}
	function x(e) {
		return e.replaceAll("\\", "/").replace(/^\/+/, "");
	}
	function S(e, t) {
		const n = t.replaceAll("\\", "/"), r = e?.includes("/") ? e.slice(0, e.lastIndexOf("/") + 1) : "", o = n.startsWith("/") ? n.slice(1) : `${r}${n}`, i = [];
		for (const a of o.split("/")) if (a && "." !== a) if (".." !== a) i.push(a);
		else {
			if (0 === i.length) return null;
			i.pop();
		}
		return i.join("/");
	}
	function N(e) {
		if ("_rels/.rels" === e) return null;
		const t = e.lastIndexOf("/_rels/");
		return t >= 0 && e.endsWith(".rels") ? `${e.slice(0, t)}/${e.slice(t + 7).slice(0, -5)}` : e.startsWith("_rels/") && e.endsWith(".rels") ? e.slice(6, -5) : void 0;
	}
	function E(e) {
		if (!e) return [];
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!t) return [];
		const n = [];
		for (let r = 0; r < t.childNodes.length; r += 1) {
			const e = t.childNodes[r];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const o = e;
			if ("Relationship" !== o.localName) continue;
			const i = o.getAttribute("Id"), a = o.getAttribute("Type"), s = o.getAttribute("Target");
			if (!i || !a || !s) continue;
			const l = o.getAttribute("TargetMode");
			n.push({
				id: i,
				type: a,
				target: s,
				targetMode: "External" === l ? "External" : "Internal"
			});
		}
		return n;
	}
	function k(e) {
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${e.map((e) => {
			const t = "External" === e.targetMode ? " TargetMode=\"External\"" : "";
			return `<Relationship Id="${y(e.id)}" Type="${y(e.type)}" Target="${y(e.target)}"${t}/>`;
		}).join("")}</Relationships>`;
	}
	function T(e, t, n) {
		return t.map((t) => {
			if ("External" === t.targetMode) return {
				...t,
				resolvedTarget: void 0
			};
			const r = S(e, t.target);
			return r ? {
				...t,
				resolvedTarget: r
			} : (n?.(t), t);
		});
	}
	const I = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties", _ = "http://purl.org/dc/terms/", C = [
		{
			key: "created",
			ns: _,
			name: "created",
			prefix: "dcterms"
		},
		{
			key: "saved",
			ns: _,
			name: "modified",
			prefix: "dcterms"
		},
		{
			key: "printed",
			ns: I,
			name: "lastPrinted",
			prefix: "cp"
		}
	];
	function A(e) {
		const t = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(e.trim());
		if (!t) return;
		const [, n, r, o, i, a, s, l] = t, c = Number(n), u = Number(r), d = Number(o), p = [
			31,
			c % 4 != 0 || c % 100 == 0 && c % 400 != 0 ? 28 : 29,
			31,
			30,
			31,
			30,
			31,
			31,
			30,
			31,
			30,
			31
		][u - 1];
		if (c < 1 || !p || d < 1 || d > p || Number(i) > 23 || Number(a) > 59 || Number(s) > 59) return;
		if ("Z" !== l && (Number(l.slice(1, 3)) > 14 || Number(l.slice(4)) > 59 || 14 === Number(l.slice(1, 3)) && 0 !== Number(l.slice(4)))) return;
		const f = Date.parse(e.trim());
		return Number.isFinite(f) ? f : void 0;
	}
	function R(e, t, n) {
		const r = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === n && r.push(e);
			}
		}
		return r;
	}
	function $(e) {
		const t = function(e) {
			if (!(e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
				const t = new b.DOMParser().parseFromString(e, "application/xml"), n = t.documentElement;
				return "http://schemas.openxmlformats.org/package/2006/metadata/core-properties" === n?.namespaceURI && "coreProperties" === n.localName ? {
					doc: t,
					root: n
				} : void 0;
			} catch {
				return;
			}
		}(e);
		if (!t) return;
		const n = {};
		for (const { key: r, ns: o, name: i } of C) {
			const e = R(t.root, o, i);
			if (1 !== e.length) continue;
			const a = e[0];
			if (Array.from({ length: a.childNodes.length }, (e, t) => a.childNodes[t]).some((e) => 1 === e?.nodeType)) continue;
			const s = A(a.textContent ?? "");
			void 0 !== s && (n[r] = s);
		}
		return Object.keys(n).length ? n : void 0;
	}
	async function D(e) {
		const t = function(e) {
			const t = e.filter((e) => "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" === e.type);
			if (1 === t.length && "External" !== t[0].targetMode) return t[0].resolvedTarget;
		}(await async function(e) {
			return T(null, E(await e.file(v)?.async("string")));
		}(e));
		if (!t) return;
		const n = await e.file(t)?.async("string");
		return n ? $(n) : void 0;
	}
	const P = "http://purl.org/dc/elements/1.1/", M = I, F = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties", O = [
		{
			key: "Title",
			ns: P,
			tag: "title",
			prefix: "dc"
		},
		{
			key: "Subject",
			ns: P,
			tag: "subject",
			prefix: "dc"
		},
		{
			key: "Author",
			ns: P,
			tag: "creator",
			prefix: "dc"
		},
		{
			key: "Keywords",
			ns: M,
			tag: "keywords",
			prefix: "cp"
		},
		{
			key: "Comments",
			ns: P,
			tag: "description",
			prefix: "dc"
		},
		{
			key: "Category",
			ns: M,
			tag: "category",
			prefix: "cp"
		},
		{
			key: "LastSavedBy",
			ns: M,
			tag: "lastModifiedBy",
			prefix: "cp"
		},
		{
			key: "RevisionNumber",
			ns: M,
			tag: "revision",
			prefix: "cp"
		},
		{
			key: "ContentStatus",
			ns: M,
			tag: "contentStatus",
			prefix: "cp"
		}
	], L = (e) => e.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(e), B = (e) => e.length > 0 && e.length <= 128 && /^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e) && ![
		"__proto__",
		"constructor",
		"prototype"
	].includes(e.toLowerCase()), U = (e, t, n) => {
		const r = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === n && r.push(e);
			}
		}
		return r;
	}, z = (e, t, n) => {
		if (!(e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
			const r = new b.DOMParser().parseFromString(e, "application/xml"), o = r.documentElement;
			return o?.namespaceURI === t && o.localName === n ? {
				doc: r,
				root: o
			} : void 0;
		} catch {
			return;
		}
	}, H = (e) => {
		for (let n = 0; n < e.childNodes.length; n++) if (1 === e.childNodes[n]?.nodeType) return;
		const t = e.textContent ?? "";
		return L(t) ? t : void 0;
	}, j = (e) => {
		if ("http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes" !== e.namespaceURI) return;
		const t = H(e);
		if (void 0 !== t) switch (e.localName) {
			case "lpwstr":
			case "lpstr": return t;
			case "bool": return /^(true|1)$/i.test(t) ? "true" : /^(false|0)$/i.test(t) ? "false" : void 0;
			case "i4":
			case "int":
			case "i8":
			case "ui4":
			case "ui8": return /^-?(0|[1-9]\d{0,15})$/.test(t) && Number.isSafeInteger(Number(t)) ? t : void 0;
			case "r8":
			case "r4": return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d{1,3})?$/.test(t) && Number.isFinite(Number(t)) ? t : void 0;
			default: return;
		}
	};
	function q(e, t) {
		const n = e.filter((e) => e.type === t);
		return 1 === n.length && "External" !== n[0]?.targetMode ? n[0]?.resolvedTarget : void 0;
	}
	async function W(e) {
		const t = await async function(e) {
			return T(null, E(await e.file(v)?.async("string")));
		}(e), n = q(t, "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"), r = q(t, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties"), [o, i] = await Promise.all([n ? e.file(n)?.async("string") : void 0, r ? e.file(r)?.async("string") : void 0]), a = o ? function(e) {
			const t = z(e, M, "coreProperties")?.root;
			if (!t) return;
			const n = Object.create(null);
			for (const r of O) {
				const e = U(t, r.ns, r.tag);
				if (1 !== e.length) continue;
				const o = H(e[0]);
				void 0 !== o && (n[r.key] = o);
			}
			return Object.keys(n).length ? n : void 0;
		}(o) : void 0, s = i ? function(e) {
			const t = z(e, F, "Properties")?.root;
			if (!t) return;
			const n = U(t, F, "property");
			if (n.length > 256) return;
			const r = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
			for (const a of n) {
				const e = a.getAttribute("name"), t = a.getAttribute("pid");
				if (!e || !B(e) || !t || !/^\d{1,9}$/.test(t) || Number(t) < 2 || o.has(t)) continue;
				o.add(t);
				const n = [];
				for (let r = 0; r < a.childNodes.length; r++) 1 === a.childNodes[r]?.nodeType && n.push(a.childNodes[r]);
				const i = 1 === n.length ? j(n[0]) : void 0, s = e.toLowerCase();
				r.has(s) ? r.set(s, null) : r.set(s, void 0 === i ? null : {
					name: e,
					value: i
				});
			}
			const i = Object.create(null);
			for (const a of r.values()) a && (i[a.name] = a.value);
			return Object.keys(i).length ? i : void 0;
		}(i) : void 0;
		return a || s ? {
			...a ? { core: a } : {},
			...s ? { custom: s } : {}
		} : void 0;
	}
	function G(e, t) {
		if (!e || !B(t)) return;
		const n = t.toLowerCase();
		let r, o = 0;
		for (const i of [e.core, e.custom]) for (const [e, t] of Object.entries(i ?? {})) if (e.toLowerCase() === n) {
			if (o++, "string" != typeof t || !L(t)) return;
			r = t;
		}
		return 1 === o ? r : void 0;
	}
	function V(e) {
		return `${e}:${crypto.randomUUID()}`;
	}
	function X() {
		return V("bookmark");
	}
	function Z() {
		return V("comment");
	}
	function Y(e = "") {
		return {
			id: V("run"),
			text: e,
			kind: "text"
		};
	}
	function Q(e = "") {
		return {
			id: V("paragraph"),
			type: "paragraph",
			runs: [Y(e)]
		};
	}
	function K(e) {
		return {
			id: V("paragraph"),
			type: "paragraph",
			runs: e.length > 0 ? e.map((e) => function(e = "", t, n, r) {
				const o = {
					id: V("run"),
					text: e
				};
				return t && (o.styles = { ...t }), n ? {
					...o,
					kind: "image",
					image: { ...n }
				} : r ? {
					...o,
					kind: "textBox",
					textBox: r
				} : {
					...o,
					kind: "text"
				};
			}(e.text, e.styles, e.image, e.textBox)) : [Y("")]
		};
	}
	function J(e, t = 1, n) {
		const r = {
			id: V("table-cell"),
			blocks: e.length > 0 ? e : [Q("")]
		};
		return t > 1 && (r.colSpan = t), n?.rowSpan && n.rowSpan > 1 && (r.rowSpan = n.rowSpan), n?.vMerge && (r.vMerge = n.vMerge), r;
	}
	function ee(e, t) {
		const n = {
			id: V("table-row"),
			cells: e
		};
		return t?.isHeader && (n.isHeader = !0), n;
	}
	const te = 96 / 72, ne = 9525, re = 12700, oe = 1440, ie = 1e5, ae = 6e4, se = 14.6667, le = (e) => ({
		width: .5,
		type: "solid",
		color: e
	});
	function ce(e, t, n) {
		const r = `${n ? "MediumShading1" : "LightShading"}-Accent${e}`, o = le(n ? "#ffffff" : t.accent);
		return {
			id: r,
			name: `${n ? "Medium Shading 1" : "Light Shading"} Accent ${e}`,
			type: "table",
			qFormat: !0,
			uiPriority: (n ? 40 : 20) + e,
			tableStyle: {
				rowBandSize: 1,
				tblLook: {
					firstRow: !0,
					lastRow: !1,
					firstCol: !1,
					lastCol: !1,
					noHBand: !1,
					noVBand: !0
				},
				borders: {
					borderTop: o,
					borderRight: o,
					borderBottom: o,
					borderLeft: o,
					borderInsideH: o,
					borderInsideV: o
				},
				conditionalFormats: {
					wholeTable: { shading: n ? t.tint : "#ffffff" },
					firstRow: {
						shading: t.accent,
						textStyle: {
							bold: !0,
							color: "#ffffff"
						}
					},
					band1Horz: { shading: t.tint }
				}
			}
		};
	}
	const ue = {
		TableNormal: {
			id: "TableNormal",
			name: "Table Normal",
			type: "table",
			isDefault: !0,
			uiPriority: 0,
			tableStyle: { tblLook: {
				firstRow: !1,
				lastRow: !1,
				firstCol: !1,
				lastCol: !1,
				noHBand: !0,
				noVBand: !0
			} }
		},
		TableGrid: {
			id: "TableGrid",
			name: "Table Grid",
			type: "table",
			qFormat: !0,
			uiPriority: 1,
			tableStyle: {
				borders: {
					borderTop: le("#7f7f7f"),
					borderRight: le("#7f7f7f"),
					borderBottom: le("#7f7f7f"),
					borderLeft: le("#7f7f7f"),
					borderInsideH: le("#7f7f7f"),
					borderInsideV: le("#7f7f7f")
				},
				tblLook: {
					firstRow: !1,
					lastRow: !1,
					firstCol: !1,
					lastCol: !1,
					noHBand: !0,
					noVBand: !0
				}
			}
		},
		...Object.fromEntries([
			{
				accent: "#4472c4",
				tint: "#d9e2f3"
			},
			{
				accent: "#ed7d31",
				tint: "#fce4d6"
			},
			{
				accent: "#a5a5a5",
				tint: "#e7e6e6"
			},
			{
				accent: "#ffc000",
				tint: "#fff2cc"
			},
			{
				accent: "#5b9bd5",
				tint: "#ddebf7"
			},
			{
				accent: "#70ad47",
				tint: "#e2f0d9"
			}
		].flatMap((e, t) => {
			const n = t + 1, r = ce(n, e, !1), o = ce(n, e, !0);
			return [[r.id, r], [o.id, o]];
		}))
	}, de = {
		normal: {
			id: "normal",
			builtinStyle: "normal",
			name: "Normal",
			type: "paragraph",
			qFormat: !0,
			uiPriority: 0,
			paragraphStyle: {
				spacingAfter: 8,
				lineHeight: 1.15
			},
			textStyle: {
				fontFamily: "Calibri, sans-serif",
				fontSize: se
			}
		},
		header: {
			id: "header",
			builtinStyle: "header",
			name: "Header",
			type: "paragraph",
			semiHidden: !0,
			basedOn: "normal",
			nextStyle: "header",
			paragraphStyle: { spacingAfter: 0 }
		},
		footer: {
			id: "footer",
			builtinStyle: "footer",
			name: "Footer",
			type: "paragraph",
			semiHidden: !0,
			basedOn: "normal",
			nextStyle: "footer",
			paragraphStyle: { spacingAfter: 0 }
		},
		heading1: {
			id: "heading1",
			builtinStyle: "heading1",
			name: "Heading 1",
			type: "paragraph",
			qFormat: !0,
			uiPriority: 10,
			basedOn: "normal",
			nextStyle: "normal",
			paragraphStyle: {
				spacingBefore: 24,
				spacingAfter: 0
			},
			textStyle: {
				fontFamily: "Calibri Light, sans-serif",
				fontSize: 27,
				color: "#2e74b5"
			}
		},
		heading2: {
			id: "heading2",
			builtinStyle: "heading2",
			name: "Heading 2",
			type: "paragraph",
			qFormat: !0,
			uiPriority: 11,
			basedOn: "normal",
			nextStyle: "normal",
			paragraphStyle: {
				spacingBefore: 13,
				spacingAfter: 0
			},
			textStyle: {
				fontFamily: "Calibri Light, sans-serif",
				fontSize: 17,
				color: "#2e74b5"
			}
		},
		heading3: {
			id: "heading3",
			builtinStyle: "heading3",
			name: "Heading 3",
			type: "paragraph",
			qFormat: !0,
			uiPriority: 12,
			basedOn: "normal",
			nextStyle: "normal",
			paragraphStyle: {
				spacingBefore: 13,
				spacingAfter: 0
			},
			textStyle: {
				fontFamily: "Calibri Light, sans-serif",
				fontSize: 16,
				color: "#1f4d78"
			}
		},
		footnoteText: {
			id: "footnoteText",
			builtinStyle: "footnoteText",
			name: "Footnote Text",
			type: "paragraph",
			semiHidden: !0,
			basedOn: "normal",
			nextStyle: "footnoteText",
			paragraphStyle: {
				spacingAfter: 0,
				lineHeight: 1
			},
			textStyle: { fontSize: 10 }
		},
		footnoteReference: {
			id: "footnoteReference",
			builtinStyle: "footnoteReference",
			name: "Footnote Reference",
			type: "character",
			semiHidden: !0,
			basedOn: "normal",
			textStyle: { superscript: !0 }
		},
		Caption: {
			id: "Caption",
			builtinStyle: "caption",
			name: "Caption",
			type: "paragraph",
			qFormat: !0,
			uiPriority: 35,
			basedOn: "normal",
			nextStyle: "normal",
			paragraphStyle: {
				align: "center",
				spacingBefore: 4,
				spacingAfter: 8
			},
			textStyle: {
				fontFamily: "Calibri, sans-serif",
				fontSize: 12,
				italic: !0
			}
		},
		...ue
	};
	function pe(e, t = "value") {
		const n = e && "object" == typeof e && "type" in e ? e.type : e;
		throw new Error(`Unhandled ${t}: ${String(n)}`);
	}
	function fe(e) {
		return "footnoteReference" === e.kind ? e.footnoteReference : void 0;
	}
	function he(e) {
		return "endnoteReference" === e.kind ? e.endnoteReference : void 0;
	}
	const me = "asset:";
	const ge = {
		styleId: void 0,
		bold: !1,
		italic: !1,
		underline: !1,
		underlineStyle: null,
		underlineColor: null,
		strike: !1,
		doubleStrike: !1,
		superscript: !1,
		subscript: !1,
		smallCaps: !1,
		allCaps: !1,
		hidden: !1,
		noProof: !1,
		webHidden: !1,
		specVanish: !1,
		rtl: !1,
		complexScript: !1,
		snapToGrid: !0,
		fitText: null,
		emphasisMark: null,
		textBorder: null,
		outline: !1,
		shadow: !1,
		emboss: !1,
		imprint: !1,
		textEffect: null,
		characterScale: null,
		characterSpacing: null,
		baselineShift: null,
		kerningThreshold: null,
		ligatures: null,
		numberSpacing: null,
		numberForm: null,
		stylisticSet: null,
		contextualAlternates: !1,
		fontFamily: "Calibri, sans-serif",
		fontSize: se,
		color: "#000000",
		highlight: null,
		shading: null,
		language: null,
		link: null
	}, we = {
		styleId: void 0,
		align: "left",
		spacingBefore: 0,
		spacingAfter: 8,
		contextualSpacing: !1,
		lineHeight: 1.15,
		lineRule: null,
		lineGridPitch: null,
		lineGridType: null,
		snapToGrid: !0,
		indentLeft: 0,
		indentRight: 0,
		indentFirstLine: 0,
		indentHanging: 0,
		mirrorIndents: !1,
		shading: null,
		borderTop: null,
		borderRight: null,
		borderBottom: null,
		borderLeft: null,
		tabs: null,
		pageBreakBefore: !1,
		keepWithNext: !1,
		keepLinesTogether: !1,
		widowControl: !0,
		textDirection: null,
		outlineLevel: null,
		suppressLineNumbers: !1,
		suppressAutoHyphens: !1,
		bidi: !1,
		kinsoku: !0,
		wordWrap: !0,
		overflowPunct: !0,
		topLinePunct: !1,
		autoSpaceDE: !0,
		autoSpaceDN: !0,
		adjustRightInd: !0,
		textAlignment: null,
		textboxTightWrap: null,
		divId: null,
		conditionalStyle: null,
		borderBetween: null,
		borderBar: null,
		framePrXml: null
	}, be = 816, ve = 1056, ye = "portrait", xe = {
		top: 96,
		right: 96,
		bottom: 96,
		left: 96,
		header: 48,
		footer: 48,
		gutter: 0
	};
	function Se(e) {
		const t = e.orientation ?? (n = e.width, r = e.height, n > r ? "landscape" : "portrait");
		var n, r;
		const o = "landscape" === t && e.width < e.height || "portrait" === t && e.width > e.height;
		return {
			width: o ? e.height : e.width,
			height: o ? e.width : e.height,
			orientation: t,
			margins: {
				top: e.margins.top,
				right: e.margins.right,
				bottom: e.margins.bottom,
				left: e.margins.left,
				header: e.margins.header,
				footer: e.margins.footer,
				gutter: e.margins.gutter
			},
			...e.columns ? { columns: e.columns } : {}
		};
	}
	function Ne(e) {
		const t = e.pageSettings;
		return Se({
			width: t?.width ?? be,
			height: t?.height ?? ve,
			orientation: t?.orientation ?? ye,
			margins: {
				top: t?.margins.top ?? xe.top,
				right: t?.margins.right ?? xe.right,
				bottom: t?.margins.bottom ?? xe.bottom,
				left: t?.margins.left ?? xe.left,
				header: t?.margins.header ?? xe.header,
				footer: t?.margins.footer ?? xe.footer,
				gutter: t?.margins.gutter ?? xe.gutter
			},
			...t?.columns ? { columns: t.columns } : {}
		});
	}
	function Ee() {
		return { merge(e, t) {
			if (!t) return { ...e };
			const n = { ...e };
			for (const [r, o] of Object.entries(t)) void 0 !== o && (n[r] = o);
			return n;
		} };
	}
	const ke = Ee(), Te = Ee();
	function Ie(e, t) {
		return ke.merge(e, t);
	}
	function _e(e, t) {
		const n = Te.merge(e, t);
		if (Array.isArray(t?.tabs)) {
			const r = [...e.tabs ?? []];
			for (const e of t.tabs) {
				const t = r.findIndex((t) => Math.abs(t.position - e.position) < 1e-6);
				t >= 0 && r.splice(t, 1), r.push(e);
			}
			n.tabs = r.sort((e, t) => e.position - t.position);
		}
		return n;
	}
	function Ce(e) {
		if (!e) return;
		const t = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.id.toLowerCase());
		if (t) return t.id;
		const n = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.name.toLowerCase());
		return n ? n.id : void 0;
	}
	function Ae(e, t) {
		if (!e || !t || !t[e]) return {};
		const n = t[e];
		return {
			...n.basedOn ? Ae(n.basedOn, t) : {},
			...n.textStyle ?? {}
		};
	}
	function Re(e, t) {
		if (!e || !t || !t[e]) return {};
		const n = t[e];
		return _e(n.basedOn ? Re(n.basedOn, t) : {}, n.paragraphStyle);
	}
	function $e(e, t, n) {
		const r = Ie(Ie(Ae(t ?? Ce(n), n), Ae(e?.styleId, n)), e);
		return {
			...ge,
			...r
		};
	}
	function De(e, t) {
		const n = e?.styleId ?? Ce(t), r = _e(Re(n, t), {
			...e,
			styleId: n
		});
		return {
			...we,
			...r
		};
	}
	function Pe(e, t) {
		if (!t) return "";
		if (!t.startsWith("asset:")) return t;
		const n = t.slice(6);
		return (e?.assets?.[n])?.url ?? t;
	}
	function Me(e) {
		return e.sections && e.sections.length > 0 ? e.sections.map((e) => ({
			...e,
			pageSettings: Se(e.pageSettings)
		})) : [{
			id: "section:default",
			blocks: [],
			pageSettings: Ne(e)
		}];
	}
	function Fe(e) {
		return Me(e);
	}
	function Oe(e) {
		switch (e.type) {
			case "paragraph": return [e];
			case "table": return e.rows.flatMap((e) => e.cells.flatMap((e) => e.blocks.flatMap(Oe)));
			default: return pe(e, "block");
		}
	}
	new class {
		indexMap = /* @__PURE__ */ new WeakMap();
		paragraphsMap = /* @__PURE__ */ new WeakMap();
		getIndex(e) {
			return this.indexMap.get(e);
		}
		setIndex(e, t) {
			this.indexMap.set(e, t);
		}
		getParagraphs(e) {
			return this.paragraphsMap.get(e);
		}
		setParagraphs(e, t) {
			this.paragraphsMap.set(e, t);
		}
	}();
	const Le = [
		"decimal",
		"decimalZero",
		"decimalFullWidth",
		"decimalFullWidth2",
		"decimalHalfWidth",
		"decimalEnclosedCircle",
		"decimalEnclosedCircleChinese",
		"decimalEnclosedFullstop",
		"decimalEnclosedParen",
		"lowerLetter",
		"upperLetter",
		"lowerRoman",
		"upperRoman",
		"ordinal",
		"ordinalText",
		"cardinalText",
		"chicago",
		"hex",
		"ideographDigital",
		"ideographEnclosedCircle",
		"ideographTraditional",
		"ideographLegal",
		"ideographZodiac",
		"ideographZodiac2",
		"ideographZodiac3",
		"aiueo",
		"aiueoFullWidth",
		"iroha",
		"irohaFullWidth",
		"chosung",
		"ganada",
		"hebrew1",
		"hebrew2",
		"russianLower",
		"russianUpper",
		"koreanDigital",
		"koreanDigital2",
		"japaneseCounting",
		"japaneseDigitalTenThousand",
		"chineseCounting",
		"chineseCountingThousand",
		"chineseLegalSimplified",
		"koreanCounting",
		"koreanLegal",
		"taiwaneseCounting",
		"taiwaneseCountingThousand",
		"taiwaneseDigital",
		"thaiCounting",
		"thaiLetters",
		"thaiNumbers",
		"vietnameseCounting",
		"bullet",
		"none"
	], Be = /* @__PURE__ */ new Set(["bullet", "none"]), Ue = /* @__PURE__ */ new Set([
		"decimal",
		"decimalZero",
		"decimalFullWidth",
		"decimalFullWidth2",
		"decimalHalfWidth"
	]), ze = /* @__PURE__ */ new Set([
		"decimalEnclosedCircle",
		"decimalEnclosedCircleChinese",
		"decimalEnclosedFullstop",
		"decimalEnclosedParen"
	]), He = /* @__PURE__ */ new Set(["lowerLetter", "upperLetter"]), je = /* @__PURE__ */ new Set(["lowerRoman", "upperRoman"]), qe = /* @__PURE__ */ new Set(["ordinal", "ordinalText"]), We = /* @__PURE__ */ new Set(["cardinalText"]), Ge = /* @__PURE__ */ new Set(["chicago"]), Ve = /* @__PURE__ */ new Set(["hex"]), Xe = /* @__PURE__ */ new Set([
		"ideographDigital",
		"ideographEnclosedCircle",
		"ideographTraditional",
		"ideographLegal",
		"ideographZodiac",
		"ideographZodiac2",
		"ideographZodiac3"
	]), Ze = /* @__PURE__ */ new Set([
		"aiueo",
		"aiueoFullWidth",
		"iroha",
		"irohaFullWidth",
		"chosung",
		"ganada",
		"hebrew1",
		"hebrew2",
		"russianLower",
		"russianUpper"
	]), Ye = /* @__PURE__ */ new Set([
		"koreanDigital",
		"koreanDigital2",
		"japaneseCounting",
		"japaneseDigitalTenThousand",
		"chineseCounting",
		"chineseCountingThousand",
		"chineseLegalSimplified",
		"koreanCounting",
		"koreanLegal",
		"taiwaneseCounting",
		"taiwaneseCountingThousand",
		"taiwaneseDigital",
		"thaiCounting",
		"thaiLetters",
		"thaiNumbers",
		"vietnameseCounting"
	]);
	function Qe(e) {
		return void 0 !== e && Le.includes(e);
	}
	function Ke(e) {
		return Qe(e) ? Be.has(e) ? "counterless" : Ue.has(e) ? "decimal" : ze.has(e) ? "enclosedDecimal" : He.has(e) ? "alphabetic" : je.has(e) ? "roman" : qe.has(e) ? "ordinalText" : We.has(e) ? "cardinalText" : Ge.has(e) ? "chicago" : Ve.has(e) ? "hex" : Xe.has(e) ? "ideographic" : Ze.has(e) ? "alphabeticSequence" : Ye.has(e) ? "countingSystem" : "unknown" : "unknown";
	}
	const Je = /* @__PURE__ */ new Map();
	function et(e) {
		return (e ?? "").trim().replace(/_/g, "-").toLowerCase();
	}
	function tt(e, t) {
		const n = et(e);
		n && Je.set(n, {
			...Je.get(n),
			...t
		});
	}
	const nt = [
		"zero",
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten",
		"eleven",
		"twelve",
		"thirteen",
		"fourteen",
		"fifteen",
		"sixteen",
		"seventeen",
		"eighteen",
		"nineteen"
	], rt = [
		"",
		"",
		"twenty",
		"thirty",
		"forty",
		"fifty",
		"sixty",
		"seventy",
		"eighty",
		"ninety"
	], ot = [
		"zeroth",
		"first",
		"second",
		"third",
		"fourth",
		"fifth",
		"sixth",
		"seventh",
		"eighth",
		"ninth",
		"tenth",
		"eleventh",
		"twelfth",
		"thirteenth",
		"fourteenth",
		"fifteenth",
		"sixteenth",
		"seventeenth",
		"eighteenth",
		"nineteenth",
		"twentieth"
	], it = [
		"zero",
		"um",
		"dois",
		"três",
		"quatro",
		"cinco",
		"seis",
		"sete",
		"oito",
		"nove",
		"dez",
		"onze",
		"doze",
		"treze",
		"quatorze",
		"quinze",
		"dezesseis",
		"dezessete",
		"dezoito",
		"dezenove",
		"vinte"
	], at = [
		"",
		"",
		"vinte",
		"trinta",
		"quarenta",
		"cinquenta",
		"sessenta",
		"setenta",
		"oitenta",
		"noventa"
	], st = [
		"zero",
		"primeiro",
		"segundo",
		"terceiro",
		"quarto",
		"quinto",
		"sexto",
		"sétimo",
		"oitavo",
		"nono",
		"décimo",
		"décimo primeiro",
		"décimo segundo",
		"décimo terceiro",
		"décimo quarto",
		"décimo quinto",
		"décimo sexto",
		"décimo sétimo",
		"décimo oitavo",
		"décimo nono",
		"vigésimo"
	];
	function lt(e) {
		const t = Math.abs(e), n = t % 100;
		if (n >= 11 && n <= 13) return `${e}th`;
		switch (t % 10) {
			case 1: return `${e}st`;
			case 2: return `${e}nd`;
			case 3: return `${e}rd`;
			default: return `${e}th`;
		}
	}
	function ct(e) {
		if (e < 0 || e > 99) return null;
		if (e < 20) return nt[e];
		const t = Math.floor(e / 10), n = e % 10;
		return 0 === n ? rt[t] : `${rt[t]} ${nt[n]}`;
	}
	function ut(e) {
		if (e < 0 || e > 99) return null;
		if (e < 20) return it[e];
		const t = Math.floor(e / 10), n = e % 10;
		return 0 === n ? at[t] : `${at[t]} e ${it[n]}`;
	}
	function dt(e) {
		return e < 1 || e > 20 ? null : ot[e];
	}
	function pt(e) {
		return e < 1 || e > 20 ? null : st[e];
	}
	tt("en-US", {
		ordinal: lt,
		cardinal: ct,
		ordinalText: dt,
		chicago: (e) => e >= 1 && e <= 10 ? ct(e) : String(e)
	}), tt("pt-BR", {
		ordinal: (e) => `${e}º`,
		cardinal: ut,
		ordinalText: pt,
		chicago: (e) => e >= 1 && e <= 10 ? ut(e) : String(e)
	}), tt("pt", {
		ordinal: (e) => `${e}º`,
		cardinal: ut,
		ordinalText: pt,
		chicago: (e) => e >= 1 && e <= 10 ? ut(e) : String(e)
	}), tt("en", {
		ordinal: lt,
		cardinal: ct,
		ordinalText: dt,
		chicago: (e) => e >= 1 && e <= 10 ? ct(e) : String(e)
	});
	const ft = [
		[1e3, "M"],
		[900, "CM"],
		[500, "D"],
		[400, "CD"],
		[100, "C"],
		[90, "XC"],
		[50, "L"],
		[40, "XL"],
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"]
	];
	function ht(e) {
		if (e <= 0 || e >= 4e3) return String(e);
		let t = e, n = "";
		for (const [r, o] of ft) for (; t >= r;) n += o, t -= r;
		return n;
	}
	function mt(e) {
		if (e <= 0) return String(e);
		let t = e, n = "";
		for (; t > 0;) n = String.fromCharCode(65 + (t - 1) % 26) + n, t = Math.floor((t - 1) / 26);
		return n;
	}
	const gt = Array.from("イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセスン"), wt = Array.from("いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせすん"), bt = Array.from("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"), vt = Array.from("가나다라마바사아자차카타파하"), yt = Array.from("אבגדהוזחטיכלמנסעפצקרשת"), xt = Array.from("абвгдежзийклмнопрстуфхцчшщъыьэюя"), St = Array.from("子丑寅卯辰巳午未申酉戌亥"), Nt = Array.from("〇一二三四五六七八九"), Et = Array.from("壱弐参肆伍陸漆捌玖"), kt = Array.from("壹貳參肆伍陸柒捌玖"), Tt = Array.from("일이삼사오육칠팔구십");
	function It(e, t) {
		if (t <= 0 || 0 === e.length) return String(t);
		const n = (t - 1) % e.length, r = Math.floor((t - 1) / e.length);
		return `${r > 0 ? r + 1 : ""}${e[n]}`;
	}
	function _t(e) {
		if (e <= 0) return String(e);
		if (e < 10) return Nt[e];
		if (10 === e) return "十";
		if (e < 20) return `十${Nt[e - 10]}`;
		if (e < 100) {
			const t = Math.floor(e / 10), n = e % 10;
			return `${Nt[t]}十${n ? Nt[n] : ""}`;
		}
		return String(e);
	}
	function Ct(e, t, n) {
		return e >= 1 && e <= n ? String.fromCodePoint(t + e - 1) : String(e);
	}
	function At(e, t, n) {
		const r = Number.isFinite(e) ? Math.floor(e) : Number(e);
		if (!Qe(t)) return String(r);
		const o = function(e) {
			const t = et(e), n = Je.get(t);
			if (n) return n;
			const r = t.split("-")[0];
			return r && Je.has(r) ? Je.get(r) : {};
		}(n);
		switch (t) {
			case "none":
			case "bullet": return "";
			case "decimal":
			case "decimalHalfWidth":
			default: return String(r);
			case "decimalZero": return String(r).padStart(2, "0");
			case "decimalFullWidth":
			case "decimalFullWidth2": return String(r).replace(/\d/g, (e) => "０１２３４５６７８９"[Number(e)]);
			case "decimalEnclosedCircle": return Ct(r, 9312, 20);
			case "decimalEnclosedCircleChinese":
			case "ideographEnclosedCircle": return Ct(r, 12928, 10);
			case "decimalEnclosedFullstop": return Ct(r, 9352, 20);
			case "decimalEnclosedParen": return Ct(r, 9332, 20);
			case "hex": return r > 0 ? r.toString(16).toUpperCase() : String(r);
			case "lowerRoman": return ht(r).toLowerCase();
			case "upperRoman": return ht(r);
			case "lowerLetter": return mt(r).toLowerCase();
			case "upperLetter": return mt(r);
			case "ordinal": return o.ordinal?.(r) ?? lt(r);
			case "ordinalText": return o.ordinalText?.(r) ?? String(r);
			case "cardinalText": return o.cardinal?.(r) ?? String(r);
			case "chicago": return o.chicago?.(r) ?? String(r);
			case "ideographDigital": return _t(r);
			case "ideographTraditional": return r > 0 && r < 10 ? Et[r] : _t(r);
			case "ideographLegal": return r > 0 && r < 10 ? kt[r] : _t(r);
			case "ideographZodiac":
			case "ideographZodiac2":
			case "ideographZodiac3": return It(St, r);
			case "aiueo":
			case "aiueoFullWidth": return It(gt, r);
			case "iroha":
			case "irohaFullWidth": return It(wt, r);
			case "chosung": return It(bt, r);
			case "ganada": return It(vt, r);
			case "hebrew1":
			case "hebrew2": return It(yt, r);
			case "russianLower": return It(xt, r);
			case "russianUpper": return It(xt, r).toUpperCase();
			case "koreanDigital":
			case "koreanDigital2": return It(Tt, r);
		}
	}
	function Rt(e) {
		return e.ooxmlNumbering;
	}
	function $t(e) {
		const t = Object.fromEntries(Object.entries(ue).filter(([t]) => !(t in e)));
		return {
			...e,
			...t
		};
	}
	function Dt(e, t, n, r, o, i) {
		const a = Se(t ? {
			width: t.width,
			height: t.height,
			orientation: t.orientation,
			margins: { ...t.margins },
			...t.columns ? { columns: t.columns } : {}
		} : {
			width: be,
			height: ve,
			orientation: ye,
			margins: { ...xe }
		});
		return {
			schemaVersion: 1,
			id: V("document"),
			pageSettings: a,
			sections: n ?? [{
				id: "section:default",
				blocks: e,
				pageSettings: a
			}],
			styles: r ? $t(r) : { ...de },
			metadata: o ?? { title: "Untitled document" },
			assets: i ?? void 0
		};
	}
	const Pt = { supportedNamespaces: /* @__PURE__ */ new Set() };
	function Mt(e, ...t) {
		return { supportedNamespaces: /* @__PURE__ */ new Set([...e.supportedNamespaces, ...t]) };
	}
	function Ft(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function Ot(e) {
		const t = e.parentNode;
		return 1 === t?.nodeType ? t : null;
	}
	function Lt(e, t) {
		let n = e;
		const r = t ? `xmlns:${t}` : "xmlns";
		for (; n;) {
			const e = n.getAttribute(r);
			if (e) return e;
			n = Ot(n);
		}
	}
	function Bt(e, t) {
		return e.getAttributeNS("http://schemas.openxmlformats.org/markup-compatibility/2006", t) ?? e.getAttribute(`mc:${t}`) ?? void 0;
	}
	function Ut(e, t) {
		const n = [];
		let r = e;
		for (; r;) n.push(r), r = Ot(r);
		const o = [];
		for (const i of n.reverse()) {
			const e = Bt(i, t);
			if (e) for (const t of e.split(/\s+/).filter(Boolean)) o.push({
				element: i,
				token: t
			});
		}
		return o;
	}
	function zt(e, t) {
		const n = t.indexOf(":");
		if (n < 1 || n === t.length - 1) return;
		const r = t.slice(0, n), o = t.slice(n + 1), i = Lt(e, r);
		return i ? `${i}\0${o}` : void 0;
	}
	function Ht(e, t) {
		const n = e.getAttribute("Requires")?.trim();
		return !!n && n.split(/\s+/).every((n) => {
			const r = Lt(e, n);
			return Boolean(r && t.supportedNamespaces.has(r));
		});
	}
	function jt(e, t) {
		let n;
		for (const r of Ft(e)) if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === r.namespaceURI) {
			if ("Choice" === r.localName && Ht(r, t)) return r;
			"Fallback" === r.localName && (n = r);
		}
		return n;
	}
	function qt(e, t = Pt) {
		const n = [], r = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const n of Ut(e, "Ignorable")) {
				const e = Lt(n.element, n.token);
				e && t.add(e);
			}
			return t;
		}(e), o = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const n of Ut(e, "ProcessContent")) {
				const e = zt(n.element, n.token);
				e && t.add(e);
			}
			return t;
		}(e);
		for (const i of Ft(e)) {
			if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === i.namespaceURI && "AlternateContent" === i.localName) {
				const e = jt(i, t);
				e && n.push(...qt(e, t));
				continue;
			}
			const e = i.namespaceURI ?? "";
			if (r.has(e) && !t.supportedNamespaces.has(e)) {
				const r = `${e}\0${i.localName ?? i.tagName}`;
				o.has(r) && n.push(...qt(i, t));
				continue;
			}
			n.push(i);
		}
		return n;
	}
	const Wt = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Gt = "http://schemas.openxmlformats.org/drawingml/2006/main", Vt = "http://schemas.microsoft.com/office/word/2010/wordml", Xt = Mt(Pt, Vt), Zt = Mt(Pt, "http://schemas.microsoft.com/office/word/2012/wordml");
	function Yt(e, t, n) {
		return e ? qt(e).filter((e) => e.namespaceURI === t && e.localName === n) : [];
	}
	const Qt = [
		"lrTb",
		"tbRl",
		"btLr",
		"lrTbV",
		"tbRlV"
	];
	function Kt(e) {
		return Qt.includes(e) ? e : void 0;
	}
	function Jt(e, t, n) {
		return Yt(e, t, n)[0] ?? null;
	}
	function en(e, t) {
		return e ? qt(e, Xt).find((e) => "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function tn(e, t) {
		return e ? qt(e, Zt).find((e) => "http://schemas.microsoft.com/office/word/2012/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function nn(e, t) {
		return e ? e.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2010/wordml", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2012/wordml", t) ?? e.getAttribute(`w:${t}`) ?? e.getAttribute(`w14:${t}`) ?? e.getAttribute(`w15:${t}`) ?? e.getAttribute(t) : null;
	}
	function rn(e, t) {
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			if (1 === r?.nodeType) {
				const e = r;
				if (e.localName === t) return e;
				const n = rn(e, t);
				if (n) return n;
			}
		}
		return null;
	}
	function on(e) {
		const t = {}, n = e.attributes;
		for (let r = 0; r < n.length; r += 1) {
			const e = n[r];
			if (!e) continue;
			const o = e.namespaceURI;
			if (!o || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o || "http://schemas.openxmlformats.org/markup-compatibility/2006" === o) continue;
			if ("xmlns" === e.prefix || "xmlns" === e.localName) continue;
			const i = e.localName ?? e.name;
			if (!i) continue;
			t[e.prefix ? `${e.prefix}:${i}` : i] = e.value;
		}
		return Object.keys(t).length > 0 ? t : void 0;
	}
	function an(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function sn(e, t) {
		const n = Jt(e, Wt, t);
		if (!n) return;
		const r = nn(n, "val");
		return null == r || "0" !== r && "false" !== r && "off" !== r && an(r);
	}
	function ln(e, t) {
		return nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", t), "val") ?? void 0;
	}
	async function cn(e, t) {
		t > 0 && t % e === 0 && await new Promise((e) => setTimeout(e, 0));
	}
	const un = {
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		bmp: "image/bmp",
		tif: "image/tiff",
		tiff: "image/tiff",
		svg: "image/svg+xml",
		emf: "image/x-emf",
		wmf: "image/x-wmf"
	}, dn = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/gif": "gif",
		"image/bmp": "bmp",
		"image/tiff": "tif",
		"image/svg+xml": "svg",
		"image/x-emf": "emf",
		"image/x-wmf": "wmf"
	};
	function pn(e) {
		return dn[e.toLowerCase()] ?? null;
	}
	async function fn(e, t, n) {
		let r = n;
		r.startsWith("/") && (r = r.slice(1)), r.startsWith("word/") || (r = "word/" + n);
		const o = e.file(r), i = function(e) {
			const t = e.split(".").pop()?.toLowerCase();
			return t ? un[t] ?? null : null;
		}(n) ?? "image/png", a = await o?.async("base64");
		if (a) return function(e, t, n) {
			const r = e.byPath.get(t);
			if (r) return `${me}${r}`;
			const o = `img-${e.nextId}`;
			return e.nextId += 1, e.assets[o] = {
				id: o,
				url: n
			}, e.byPath.set(t, o), `${me}${o}`;
		}(t, r, `data:${i};base64,${a}`);
	}
	const hn = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", mn = "urn:schemas-microsoft-com:vml";
	function gn(e, t, n) {
		return e ? Array.from(e.getElementsByTagNameNS(t, n)) : [];
	}
	function wn(e, t, n) {
		return gn(e, t, n)[0] ?? null;
	}
	function bn(e, t) {
		if (e) for (let n = 0; n < e.attributes.length; n += 1) {
			const r = e.attributes.item(n);
			if (r?.localName === t) return r.value;
		}
	}
	function vn(e) {
		const t = bn(e, "style") ?? "", n = /(?:^|;)\s*width\s*:\s*([\d.]+)\s*px/i.exec(t)?.[1], r = /(?:^|;)\s*height\s*:\s*([\d.]+)\s*px/i.exec(t)?.[1];
		return {
			...n && Number.isFinite(Number(n)) ? { widthPx: Number(n) } : {},
			...r && Number.isFinite(Number(r)) ? { heightPx: Number(r) } : {}
		};
	}
	function yn(e) {
		const t = wn(e, "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "extent"), n = Number(bn(t, "cx")), r = Number(bn(t, "cy"));
		return {
			...Number.isFinite(n) && n > 0 ? { widthPx: n / 9525 } : {},
			...Number.isFinite(r) && r > 0 ? { heightPx: r / 9525 } : {}
		};
	}
	function xn(e, t) {
		return {
			numPicBulletId: e.numPicBulletId,
			src: t,
			...e.widthPx ? { widthPx: e.widthPx } : {},
			...e.heightPx ? { heightPx: e.heightPx } : {},
			...e.altText ? { altText: e.altText } : {}
		};
	}
	function Sn(e) {
		const t = /* @__PURE__ */ new Map();
		if (!e) return t;
		const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement?.childNodes;
		if (!n) return t;
		for (let r = 0; r < n.length; r += 1) {
			const e = n[r];
			if (1 === e?.nodeType) {
				const n = e;
				if ("Relationship" === n.localName) {
					const e = n.getAttribute("Id"), r = n.getAttribute("Target");
					e && r && t.set(e, r);
				}
			}
		}
		return t;
	}
	async function Nn(e, t) {
		const n = t.lastIndexOf("/"), r = n >= 0 ? t.slice(0, n) : "", o = n >= 0 ? t.slice(n + 1) : t, i = r ? `${r}/_rels/${o}.rels` : `_rels/${o}.rels`;
		return Sn(await e.file(i)?.async("string"));
	}
	const En = (e) => Jt(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "latin")?.getAttribute("typeface")?.trim() || void 0, kn = (e) => Jt(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "cs")?.getAttribute("typeface")?.trim() || En(e), Tn = (e) => Jt(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "ea")?.getAttribute("typeface")?.trim() || En(e);
	function In(e, t) {
		const n = 10 ** t;
		return Math.round(e * n) / n;
	}
	function _n(e, t) {
		const n = e ? Number(e) : NaN;
		return Number.isFinite(n) ? Math.round(n / oe * 96) : t;
	}
	function Cn(e) {
		const t = e ? Number(e) : NaN;
		if (Number.isFinite(t)) return In(t / 20, 4);
	}
	function An(e) {
		const t = e?.trim();
		if (t && "auto" !== t && "none" !== t) return t.startsWith("#") ? t : `#${t.toUpperCase()}`;
	}
	const Rn = [
		"dk1",
		"lt1",
		"dk2",
		"lt2",
		"accent1",
		"accent2",
		"accent3",
		"accent4",
		"accent5",
		"accent6",
		"hlink",
		"folHlink"
	];
	function $n(e) {
		const t = Jt(e, Gt, "srgbClr");
		if (t) return An(nn(t, "val"));
		const n = Jt(e, Gt, "sysClr");
		return n ? An(nn(n, "lastClr")) : void 0;
	}
	function Dn(e) {
		if (!e) return;
		const t = Number.parseInt(e, 16);
		return Number.isFinite(t) ? t / 255 : void 0;
	}
	function Pn(e, t, n) {
		const r = (e) => function(e) {
			return Math.min(255, Math.max(0, Math.round(e)));
		}(e).toString(16).padStart(2, "0").toUpperCase();
		return `#${r(e)}${r(t)}${r(n)}`;
	}
	function Mn(e, t) {
		const n = nn(e, "themeColor");
		if (!n) return;
		const r = function(e) {
			switch (e) {
				case "dark1":
				case "text1": return "dk1";
				case "light1":
				case "background1": return "lt1";
				case "dark2":
				case "text2": return "dk2";
				case "light2":
				case "background2": return "lt2";
				case "accent1":
				case "accent2":
				case "accent3":
				case "accent4":
				case "accent5":
				case "accent6": return e;
				case "hyperlink": return "hlink";
				case "followedHyperlink": return "folHlink";
				default: return;
			}
		}(n), o = r ? t[r] : void 0;
		if (!o) return;
		let i = Number.parseInt(o.slice(1, 3), 16), a = Number.parseInt(o.slice(3, 5), 16), s = Number.parseInt(o.slice(5, 7), 16);
		const l = Dn(nn(e, "themeShade"));
		void 0 !== l && (i *= l, a *= l, s *= l);
		const c = Dn(nn(e, "themeTint"));
		if (void 0 !== c) {
			const e = 255 * (1 - c);
			i = i * c + e, a = a * c + e, s = s * c + e;
		}
		return Pn(i, a, s);
	}
	function Fn(e) {
		if (!e) return {
			fonts: {},
			colors: {}
		};
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement, n = t ? Yt(t, "http://schemas.openxmlformats.org/drawingml/2006/main", "themeElements")[0] ?? null : null, r = function(e) {
			const t = Jt(e, Gt, "fontScheme"), n = Jt(t, Gt, "majorFont"), r = Jt(t, Gt, "minorFont");
			return {
				majorHAnsi: En(n),
				minorHAnsi: En(r),
				majorEastAsia: Tn(n),
				minorEastAsia: Tn(r),
				majorBidi: kn(n),
				minorBidi: kn(r)
			};
		}(n), o = function(e) {
			const t = Jt(e, Gt, "clrScheme");
			if (!t) return {};
			const n = {};
			for (const r of Rn) {
				const e = $n(Jt(t, Gt, r));
				e && (n[r] = e);
			}
			return n;
		}(n), i = n ? Yt(n, Gt, "fmtScheme")[0] : void 0;
		return {
			fonts: r,
			colors: o,
			data: {
				name: t?.getAttribute("name") || void 0,
				colors: { ...o },
				fonts: {
					major: Object.fromEntries(Object.entries(r).filter(([e]) => e.startsWith("major"))),
					minor: Object.fromEntries(Object.entries(r).filter(([e]) => e.startsWith("minor")))
				},
				effectsXml: i ? Array.from(i.childNodes).map((e) => new b.XMLSerializer().serializeToString(e)).join("") : void 0,
				sourceXml: e
			}
		};
	}
	const On = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, Ln = {
		continuous: "continuous",
		eachSect: "eachSection"
	};
	function Bn(e) {
		if (!e) return;
		const t = {}, n = nn(Jt(e, Wt, "numFmt"), "val");
		n && On[n] && (t.numberFormat = On[n]);
		const r = Number.parseInt(nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "numStart"), "val") ?? "", 10);
		Number.isFinite(r) && r > 0 && (t.startAt = r);
		const o = nn(Jt(e, Wt, "numRestart"), "val");
		return o && Ln[o] && (t.restart = Ln[o]), Object.keys(t).length > 0 ? t : void 0;
	}
	const Un = {
		aliceblue: "F0F8FF",
		antiquewhite: "FAEBD7",
		aqua: "00FFFF",
		aquamarine: "7FFFD4",
		azure: "F0FFFF",
		beige: "F5F5DC",
		bisque: "FFE4C4",
		black: "000000",
		blanchedalmond: "FFEBCD",
		blue: "0000FF",
		blueviolet: "8A2BE2",
		brown: "A52A2A",
		burlywood: "DEB887",
		cadetblue: "5F9EA0",
		chartreuse: "7FFF00",
		chocolate: "D2691E",
		coral: "FF7F50",
		cornflowerblue: "6495ED",
		cornsilk: "FFF8DC",
		crimson: "DC143C",
		cyan: "00FFFF",
		darkblue: "00008B",
		darkcyan: "008B8B",
		darkgoldenrod: "B8860B",
		darkgray: "A9A9A9",
		darkgreen: "006400",
		darkgrey: "A9A9A9",
		darkkhaki: "BDB76B",
		darkmagenta: "8B008B",
		darkolivegreen: "556B2F",
		darkorange: "FF8C00",
		darkorchid: "9932CC",
		darkred: "8B0000",
		darksalmon: "E9967A",
		darkseagreen: "8FBC8F",
		darkslateblue: "483D8B",
		darkslategray: "2F4F4F",
		darkslategrey: "2F4F4F",
		darkturquoise: "00CED1",
		darkviolet: "9400D3",
		deeppink: "FF1493",
		deepskyblue: "00BFFF",
		dimgray: "696969",
		dimgrey: "696969",
		dodgerblue: "1E90FF",
		firebrick: "B22222",
		floralwhite: "FFFAF0",
		forestgreen: "228B22",
		fuchsia: "FF00FF",
		gainsboro: "DCDCDC",
		ghostwhite: "F8F8FF",
		gold: "FFD700",
		goldenrod: "DAA520",
		gray: "808080",
		green: "008000",
		greenyellow: "ADFF2F",
		grey: "808080",
		honeydew: "F0FFF0",
		hotpink: "FF69B4",
		indianred: "CD5C5C",
		indigo: "4B0082",
		ivory: "FFFFF0",
		khaki: "F0E68C",
		lavender: "E6E6FA",
		lavenderblush: "FFF0F5",
		lawngreen: "7CFC00",
		lemonchiffon: "FFFACD",
		lightblue: "ADD8E6",
		lightcoral: "F08080",
		lightcyan: "E0FFFF",
		lightgoldenrodyellow: "FAFAD2",
		lightgray: "D3D3D3",
		lightgreen: "90EE90",
		lightgrey: "D3D3D3",
		lightpink: "FFB6C1",
		lightsalmon: "FFA07A",
		lightseagreen: "20B2AA",
		lightskyblue: "87CEFA",
		lightslategray: "778899",
		lightslategrey: "778899",
		lightsteelblue: "B0C4DE",
		lightyellow: "FFFFE0",
		lime: "00FF00",
		limegreen: "32CD32",
		linen: "FAF0E6",
		magenta: "FF00FF",
		maroon: "800000",
		mediumaquamarine: "66CDAA",
		mediumblue: "0000CD",
		mediumorchid: "BA55D3",
		mediumpurple: "9370DB",
		mediumseagreen: "3CB371",
		mediumslateblue: "7B68EE",
		mediumspringgreen: "00FA9A",
		mediumturquoise: "48D1CC",
		mediumvioletred: "C71585",
		midnightblue: "191970",
		mintcream: "F5FFFA",
		mistyrose: "FFE4E1",
		moccasin: "FFE4B5",
		navajowhite: "FFDEAD",
		navy: "000080",
		oldlace: "FDF5E6",
		olive: "808000",
		olivedrab: "6B8E23",
		orange: "FFA500",
		orangered: "FF4500",
		orchid: "DA70D6",
		palegoldenrod: "EEE8AA",
		palegreen: "98FB98",
		paleturquoise: "AFEEEE",
		palevioletred: "DB7093",
		papayawhip: "FFEFD5",
		peachpuff: "FFDAB9",
		peru: "CD853F",
		pink: "FFC0CB",
		plum: "DDA0DD",
		powderblue: "B0E0E6",
		purple: "800080",
		rebeccapurple: "663399",
		red: "FF0000",
		rosybrown: "BC8F8F",
		royalblue: "4169E1",
		saddlebrown: "8B4513",
		salmon: "FA8072",
		sandybrown: "F4A460",
		seagreen: "2E8B57",
		seashell: "FFF5EE",
		sienna: "A0522D",
		silver: "C0C0C0",
		skyblue: "87CEEB",
		slateblue: "6A5ACD",
		slategray: "708090",
		slategrey: "708090",
		snow: "FFFAFA",
		springgreen: "00FF7F",
		steelblue: "4682B4",
		tan: "D2B48C",
		teal: "008080",
		thistle: "D8BFD8",
		tomato: "FF6347",
		turquoise: "40E0D0",
		violet: "EE82EE",
		wheat: "F5DEB3",
		white: "FFFFFF",
		whitesmoke: "F5F5F5",
		yellow: "FFFF00",
		yellowgreen: "9ACD32"
	}, zn = /^[0-9a-fA-F]{6}$/;
	function Hn(e) {
		return e.trim().replace(/^#/, "");
	}
	function jn(e) {
		if (!e) return null;
		const t = Hn(e);
		return zn.test(t) ? t.toUpperCase() : null;
	}
	function qn(e) {
		const t = jn(e);
		if (t) return t;
		const n = e?.trim();
		if (!n) return null;
		const r = n.toLowerCase();
		if (Object.hasOwn(Un, r)) return Un[r];
		const o = n.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
		if (o) {
			const e = o.length <= 4 ? [...o].map((e) => e + e).join("") : o;
			return 8 === e.length && "ff" !== e.slice(6).toLowerCase() ? null : e.slice(0, 6).toUpperCase();
		}
		const i = n.match(/^rgba?\((.*)\)$/i)?.[1];
		if (!i) return null;
		let a, s;
		if (i.includes(",")) {
			const e = i.split(",").map((e) => e.trim());
			if (3 !== e.length && 4 !== e.length) return null;
			if (a = e.slice(0, 3), !a.every((e) => e.endsWith("%") === a[0].endsWith("%"))) return null;
			s = e[3];
		} else {
			const e = i.split("/");
			if (e.length > 2) return null;
			a = e[0].trim().split(/\s+/), s = e[1]?.trim();
		}
		const l = (e) => {
			const t = e.endsWith("%") ? e.slice(0, -1) : e;
			if (!/^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(t)) return null;
			const n = Number(t);
			return Number.isFinite(n) ? n : null;
		};
		if (void 0 !== s) {
			const e = l(s);
			if (null === e || e / (s.endsWith("%") ? 100 : 1) < 1) return null;
		}
		if (3 !== a.length) return null;
		const c = a.map((e) => {
			const t = l(e);
			return null === t ? null : t * (e.endsWith("%") ? 2.55 : 1);
		});
		return c.some((e) => null === e) ? null : function(e, t, n) {
			const r = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
			return `#${r(e)}${r(t)}${r(n)}`;
		}(c[0], c[1], c[2]).slice(1).toUpperCase();
	}
	const Wn = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Gn = "http://schemas.openxmlformats.org/package/2006/relationships", Vn = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", Xn = "http://schemas.microsoft.com/office/word/2010/wordml";
	function Zn(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
	}
	function Yn(e, t) {
		return Number.isFinite(e) ? Math.max(0, Math.round(e / 96 * oe)) : t;
	}
	function Qn(e) {
		return null != e && Number.isFinite(e) ? Math.round(e / 96 * oe) : null;
	}
	function Kn(e) {
		return null != e && Number.isFinite(e) ? Math.max(0, Math.round(20 * e)) : null;
	}
	function Jn(e, t = "000000") {
		return qn(e) ?? t;
	}
	function er(e) {
		return `<w:shd w:val="clear" w:color="auto" w:fill="${Jn(e, "FFFFFF")}"/>`;
	}
	function tr(e) {
		return e.length > 0 && e.length <= 128 && /^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e);
	}
	function nr(e) {
		return e.length <= 4096 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(e);
	}
	function rr(e, t, n) {
		const r = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === n && r.push(e);
			}
		}
		return r;
	}
	function or(e, t) {
		if (!e || !tr(t)) return;
		const n = t.toLowerCase();
		let r;
		for (const [o, i] of Object.entries(e)) if (o.toLowerCase() === n) {
			if (void 0 !== r || "string" != typeof i || !nr(i)) return;
			r = i;
		}
		return r;
	}
	function ir(e) {
		if (!e) return;
		const t = nn(e, "id"), n = nn(e, "author"), r = nn(e, "date");
		if (!t || !n || !r) return;
		const o = Date.parse(r);
		return Number.isFinite(o) ? {
			id: t,
			author: n,
			date: o
		} : void 0;
	}
	function ar(e) {
		const t = nn(e, "val");
		if (null == t) return;
		const n = Number.parseInt(t, 10);
		return Number.isFinite(n) ? n : void 0;
	}
	function sr(e, t) {
		if (!e || !/^\d+$/.test(e)) return;
		const n = Number.parseInt(e, 10);
		return Number.isSafeInteger(n) && n >= t ? n : void 0;
	}
	function lr(e) {
		const t = {}, n = nn(Jt(e, Wt, "numFmt"), "val");
		n && (t.kind = "bullet" === n ? "bullet" : "ordered", t.format = function(e) {
			const t = Ke(e);
			return "decimal" === t || "enclosedDecimal" === t || "alphabetic" === t || "roman" === t || "hex" === t || "ideographic" === t || "alphabeticSequence" === t || "counterless" === t;
		}(n) || function(e) {
			const t = Ke(e);
			return "ordinalText" === t || "cardinalText" === t || "chicago" === t;
		}(n) ? n : void 0, t.rawFormat = n);
		const r = nn(Jt(e, Wt, "suff"), "val");
		"tab" !== r && "space" !== r && "nothing" !== r || (t.suffix = r);
		const o = ar(Jt(e, Wt, "start"));
		void 0 !== o && (t.startAt = o), t.levelText = nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "lvlText"), "val") ?? void 0;
		const i = nn(Jt(e, Wt, "lvlJc"), "val");
		"left" !== i && "center" !== i && "right" !== i || (t.alignment = i);
		const a = Jt(e, Wt, "isLgl");
		a && (t.legal = function(e) {
			return null == e || "1" === e || "true" === e || "on" === e;
		}(nn(a, "val")));
		const s = ar(Jt(e, Wt, "lvlRestart"));
		void 0 !== s && (t.restartAfterLevel = s), t.paragraphStyleId = nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "pStyle"), "val") ?? void 0, t.levelPictureId = nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "lvlPicBulletId"), "val") ?? void 0, "bullet" === t.kind && t.levelText && (t.bulletGlyph = t.levelText);
		const c = Jt(Jt(e, Wt, "rPr"), Wt, "rFonts");
		t.bulletFont = nn(c, "ascii") ?? nn(c, "hAnsi") ?? void 0;
		const d = Jt(Jt(e, Wt, "pPr"), Wt, "ind");
		if (d) {
			const e = nn(d, "left") ?? nn(d, "start"), n = nn(d, "hanging"), r = null != e ? _n(e, 0) : void 0, o = null != n ? _n(n, 0) : void 0;
			void 0 === r && void 0 === o || (t.indent = {
				left: r,
				hanging: o
			});
		}
		return t;
	}
	function cr(e) {
		const t = {
			abstractLevels: /* @__PURE__ */ new Map(),
			numOverrideLevels: /* @__PURE__ */ new Map(),
			numStartOverrides: /* @__PURE__ */ new Map(),
			numToAbstractId: /* @__PURE__ */ new Map(),
			abstractStyleLinks: /* @__PURE__ */ new Map(),
			parsedPictureBullets: /* @__PURE__ */ new Map(),
			pictureBullets: /* @__PURE__ */ new Map(),
			seenInstances: /* @__PURE__ */ new Set()
		};
		if (!e) return t;
		const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!n) return t;
		for (const [r, o] of function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const n of gn(e, hn, "numPicBullet")) {
				const e = bn(n, "numPicBulletId");
				if (!e) continue;
				const r = wn(n, hn, "pict"), o = wn(n, hn, "drawing"), i = bn(wn(r, mn, "imagedata"), "id") ?? bn(wn(o, "http://schemas.openxmlformats.org/drawingml/2006/main", "blip"), "embed");
				if (!i) continue;
				const a = wn(r, mn, "shape"), s = bn(a, "alt");
				t.set(e, {
					numPicBulletId: e,
					relationshipId: i,
					...vn(a),
					...yn(o),
					...s ? { altText: s } : {}
				});
			}
			return t;
		}(n)) t.parsedPictureBullets.set(r, o);
		for (const r of Array.from(n.getElementsByTagNameNS(Wt, "abstractNum"))) {
			const e = nn(r, "abstractNumId");
			if (!e) continue;
			const n = nn(Jt(r, Wt, "numStyleLink"), "val"), o = nn(Jt(r, Wt, "styleLink"), "val");
			(n || o) && t.abstractStyleLinks.set(e, {
				...n ? { numStyleLink: n } : {},
				...o ? { styleLink: o } : {}
			});
			for (const i of Yt(r, Wt, "lvl")) {
				const n = nn(i, "ilvl") ?? "0";
				t.abstractLevels.set(`${e}:${n}`, lr(i));
			}
		}
		for (const r of Array.from(n.getElementsByTagNameNS(Wt, "num"))) {
			const e = nn(r, "numId"), n = nn(Jt(r, Wt, "abstractNumId"), "val");
			if (e && n) {
				t.numToAbstractId.set(e, n);
				for (const n of Yt(r, Wt, "lvlOverride")) {
					const r = nn(n, "ilvl") ?? "0", o = Jt(n, Wt, "lvl");
					o && t.numOverrideLevels.set(`${e}:${r}`, lr(o));
					const i = ar(Jt(n, Wt, "startOverride"));
					void 0 !== i && t.numStartOverrides.set(`${e}:${r}`, i);
				}
			}
		}
		return t;
	}
	function ur(e, t, n) {
		const r = e.numToAbstractId.get(t), o = r ? e.abstractLevels.get(`${r}:${n}`) : void 0;
		return e.numOverrideLevels.get(`${t}:${n}`) ?? o ?? {};
	}
	function dr(e, t, n = {}) {
		if (!e) return;
		const r = Jt(e, Wt, "numPr");
		if (!r) return;
		const o = nn(Jt(r, Wt, "numId"), "val");
		if (!o) return;
		const i = nn(Jt(r, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "ilvl"), "val") ?? "0", a = Number.parseInt(i, 10), s = Number.isFinite(a) ? a : 0, l = ur(t, o, s), c = [];
		for (let S = 0; S <= s; S += 1) c[S] = ur(t, o, S).format ?? "decimal";
		const u = `${o}:${s}`, d = !t.seenInstances.has(u);
		!1 !== n.trackInstance && t.seenInstances.add(u);
		const p = d ? t.numStartOverrides.get(u) ?? l.startAt : void 0, f = t.numToAbstractId.get(o), h = f ? t.abstractLevels.get(`${f}:${s}`)?.levelPictureId : void 0, m = l.levelPictureId ?? h, g = m ? t.pictureBullets.get(m) : void 0, w = {
			kind: g ? "bullet" : l.kind ?? "ordered",
			level: s,
			instanceId: o,
			suffix: l.suffix ?? "tab",
			...l.format ? { format: l.format } : {},
			...c.length ? { levelFormats: c } : {},
			...l.levelText ? { levelText: l.levelText } : {},
			...l.alignment ? { alignment: l.alignment } : {},
			...void 0 !== l.legal ? { legal: l.legal } : {},
			...void 0 !== p && 1 !== p ? { startAt: p } : {},
			...l.bulletGlyph ? { bulletGlyph: l.bulletGlyph } : {},
			...l.bulletFont ? { bulletFont: l.bulletFont } : {},
			...g ? { bulletPicture: g } : {}
		}, b = sr(o, 1), v = sr(t.numToAbstractId.get(o), 0), y = t.numToAbstractId.get(o), x = y ? t.abstractStyleLinks.get(y) : void 0;
		return (void 0 !== b || void 0 !== v || l.rawFormat || void 0 !== l.restartAfterLevel || l.paragraphStyleId || x) && function(e, t) {
			e.ooxmlNumbering = {
				...t,
				importedFormat: e.format,
				importedKind: e.kind
			};
		}(w, {
			...void 0 !== b ? { sourceNumId: b } : {},
			...void 0 !== v ? { sourceAbstractNumId: v } : {},
			...l.rawFormat ? { format: l.rawFormat } : {},
			...void 0 !== l.restartAfterLevel ? { restartAfterLevel: l.restartAfterLevel } : {},
			...l.paragraphStyleId ? { paragraphStyleId: l.paragraphStyleId } : {},
			...x?.numStyleLink ? { numStyleLink: x.numStyleLink } : {},
			...x?.styleLink ? { styleLink: x.styleLink } : {}
		}), {
			list: w,
			indent: l.indent
		};
	}
	const pr = {
		normal: {
			type: "paragraph",
			names: ["Normal"]
		},
		heading1: {
			type: "paragraph",
			names: ["Heading 1", "Título 1"]
		},
		heading2: {
			type: "paragraph",
			names: ["Heading 2", "Título 2"]
		},
		heading3: {
			type: "paragraph",
			names: ["Heading 3", "Título 3"]
		},
		heading4: {
			type: "paragraph",
			names: ["Heading 4", "Título 4"]
		},
		heading5: {
			type: "paragraph",
			names: ["Heading 5", "Título 5"]
		},
		heading6: {
			type: "paragraph",
			names: ["Heading 6", "Título 6"]
		},
		heading7: {
			type: "paragraph",
			names: ["Heading 7", "Título 7"]
		},
		heading8: {
			type: "paragraph",
			names: ["Heading 8", "Título 8"]
		},
		heading9: {
			type: "paragraph",
			names: ["Heading 9", "Título 9"]
		},
		title: {
			type: "paragraph",
			names: ["Title", "Título"]
		},
		subtitle: {
			type: "paragraph",
			names: ["Subtitle", "Subtítulo"]
		},
		caption: {
			type: "paragraph",
			names: ["Caption", "Legenda"]
		},
		quote: {
			type: "paragraph",
			names: ["Quote", "Citação"]
		},
		emphasis: {
			type: "character",
			names: ["Emphasis", "Ênfase"]
		},
		strong: {
			type: "character",
			names: ["Strong", "Forte"]
		},
		header: {
			type: "paragraph",
			names: ["Header", "Cabeçalho"]
		},
		footer: {
			type: "paragraph",
			names: ["Footer", "Rodapé"]
		},
		footnoteText: {
			type: "paragraph",
			names: ["Footnote Text", "Texto de nota de rodapé"]
		},
		footnoteReference: {
			type: "character",
			names: ["Footnote Reference", "Referência de nota de rodapé"]
		}
	}, fr = (e) => e.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[\s_-]+/g, "");
	function hr(e) {
		if (!0 === e.customStyle || "table" === e.type) return;
		const t = fr(e.id), n = fr(e.name);
		for (const r of Object.keys(pr)) {
			const o = pr[r];
			if (o.type !== e.type) continue;
			const i = o.names.map(fr);
			if ((t === fr(r) || i.includes(t)) && i.includes(n)) return r;
		}
	}
	function mr(e) {
		if (!e) return;
		const t = nn(e, "val");
		if ("nil" === t || "none" === t) return {
			width: 0,
			type: "none",
			color: "transparent"
		};
		const n = Number(nn(e, "sz")), r = Number.isFinite(n) && n > 0 ? In(n / 8, 4) : .75, o = An(nn(e, "color")) ?? "#000000", i = t?.toLowerCase() ?? "single";
		return {
			width: r,
			type: i.includes("dotted") || i.includes("dot") ? "dotted" : i.includes("dash") ? "dashed" : "solid",
			color: o
		};
	}
	function gr(e) {
		return e ? {
			borderTop: mr(Jt(e, Wt, "top")),
			borderRight: mr(Jt(e, Wt, "right")),
			borderBottom: mr(Jt(e, Wt, "bottom")),
			borderLeft: mr(Jt(e, Wt, "left")),
			borderStart: mr(Jt(e, Wt, "start")),
			borderEnd: mr(Jt(e, Wt, "end")),
			borderTopLeftToBottomRight: mr(Jt(e, Wt, "tl2br")),
			borderTopRightToBottomLeft: mr(Jt(e, Wt, "tr2bl")),
			borderBetween: mr(Jt(e, Wt, "between")),
			borderBar: mr(Jt(e, Wt, "bar"))
		} : {};
	}
	function wr(e) {
		const t = Object.entries(e).filter(([, e]) => void 0 !== e);
		return t.length > 0 ? Object.fromEntries(t) : void 0;
	}
	function br(e) {
		return Object.keys(e).length > 0 ? e : void 0;
	}
	function vr(e, t) {
		return br({
			...e ?? {},
			...t ?? {}
		});
	}
	function yr(e, t) {
		return An(nn(e, "fill")) || (t ? Mn(e, t) : void 0);
	}
	function xr(e) {
		const t = Jt(e, Vt, "solidFill");
		if (t) {
			const e = function(e) {
				const t = Jt(e, Vt, "srgbClr");
				if (!t) return null;
				const n = nn(t, "val");
				return n ? An(n) ?? null : null;
			}(t);
			if (e) return {
				type: "solid",
				color: e
			};
		}
		const n = Jt(e, Vt, "gradFill");
		if (n) {
			const e = Jt(n, Vt, "gsLst");
			if (e) {
				const t = [];
				for (let n = 0; n < e.childNodes.length; n++) {
					const r = e.childNodes[n];
					if (r?.nodeType !== r.ELEMENT_NODE) continue;
					const o = r;
					if ("http://schemas.microsoft.com/office/word/2010/wordml" !== o.namespaceURI || "gs" !== o.localName) continue;
					const i = nn(o, "pos"), a = null !== i ? Number(i) / ie : NaN;
					if (!Number.isFinite(a)) continue;
					const s = Jt(o, Vt, "srgbClr");
					if (!s) continue;
					const l = nn(s, "val");
					if (!l) continue;
					const c = An(l);
					if (!c) continue;
					const u = Jt(s, Vt, "alpha"), d = u ? nn(u, "val") : null, p = null !== d ? Number(d) / ie : void 0, f = {
						position: a,
						color: c
					};
					void 0 !== p && Number.isFinite(p) && (f.alpha = p), t.push(f);
				}
				if (t.length > 0) {
					const e = Jt(n, Vt, "lin"), r = e ? nn(e, "ang") : null, o = null !== r ? Number(r) / ae : void 0, i = {
						type: "gradient",
						stops: t
					};
					return void 0 !== o && Number.isFinite(o) && (i.angle = o), i;
				}
			}
		}
		return null;
	}
	function Sr(e) {
		const t = Jt(e, Vt, "srgbClr");
		if (!t) return null;
		const n = nn(t, "val"), r = n ? An(n) ?? null : null;
		if (!r) return null;
		const o = Jt(t, Vt, "alpha"), i = o ? nn(o, "val") : null, a = null !== i && Number.isFinite(Number(i)) ? Number(i) / ie : void 0;
		return {
			color: r,
			...void 0 !== a ? { alpha: a } : {}
		};
	}
	function Nr(e, t) {
		if (!e) return;
		const n = $e(e, t, de), r = $e(void 0, t, de), o = (e, t) => e !== t ? e : void 0, i = (e, t, n) => void 0 !== e ? e : o(t, n);
		return wr({
			styleId: e.styleId,
			bold: i(e.bold, n.bold, r.bold),
			italic: i(e.italic, n.italic, r.italic),
			underline: i(e.underline, n.underline, r.underline),
			underlineStyle: i(e.underlineStyle, n.underlineStyle, r.underlineStyle),
			underlineColor: o(n.underlineColor, r.underlineColor),
			strike: i(e.strike, n.strike, r.strike),
			doubleStrike: i(e.doubleStrike, n.doubleStrike, r.doubleStrike),
			superscript: i(e.superscript, n.superscript, r.superscript),
			subscript: i(e.subscript, n.subscript, r.subscript),
			smallCaps: i(e.smallCaps, n.smallCaps, r.smallCaps),
			allCaps: i(e.allCaps, n.allCaps, r.allCaps),
			hidden: i(e.hidden, n.hidden, r.hidden),
			noProof: i(e.noProof, n.noProof, r.noProof),
			webHidden: i(e.webHidden, n.webHidden, r.webHidden),
			specVanish: i(e.specVanish, n.specVanish, r.specVanish),
			rtl: i(e.rtl, n.rtl, r.rtl),
			complexScript: i(e.complexScript, n.complexScript, r.complexScript),
			snapToGrid: i(e.snapToGrid, n.snapToGrid, r.snapToGrid),
			outline: i(e.outline, n.outline, r.outline),
			shadow: i(e.shadow, n.shadow, r.shadow),
			emboss: i(e.emboss, n.emboss, r.emboss),
			imprint: i(e.imprint, n.imprint, r.imprint),
			fitText: o(n.fitText, r.fitText),
			emphasisMark: o(n.emphasisMark, r.emphasisMark),
			textBorder: o(n.textBorder, r.textBorder),
			textEffect: o(n.textEffect, r.textEffect),
			characterScale: o(n.characterScale, r.characterScale),
			characterSpacing: o(n.characterSpacing, r.characterSpacing),
			baselineShift: o(n.baselineShift, r.baselineShift),
			kerningThreshold: o(n.kerningThreshold, r.kerningThreshold),
			ligatures: o(n.ligatures, r.ligatures),
			numberSpacing: o(n.numberSpacing, r.numberSpacing),
			numberForm: o(n.numberForm, r.numberForm),
			stylisticSet: o(n.stylisticSet, r.stylisticSet),
			contextualAlternates: i(e.contextualAlternates, n.contextualAlternates, r.contextualAlternates),
			fontFamily: i(e.fontFamily, n.fontFamily, r.fontFamily),
			fontSize: i(e.fontSize, n.fontSize, r.fontSize),
			color: o(n.color, r.color),
			textFill: o(n.textFill, r.textFill),
			textOutline: o(n.textOutline, r.textOutline),
			textShadow: o(n.textShadow, r.textShadow),
			glow: o(n.glow, r.glow),
			reflection: o(n.reflection, r.reflection),
			scene3dXml: o(n.scene3dXml, r.scene3dXml),
			props3dXml: o(n.props3dXml, r.props3dXml),
			highlight: o(n.highlight, r.highlight),
			shading: o(n.shading, r.shading),
			language: o(n.language, r.language),
			link: o(n.link, r.link),
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: Nr(e.propertyRevision.previous, t) ?? {}
			} : void 0
		});
	}
	function Er(e, t) {
		if (!e) return;
		const n = {}, r = ln(e, "rStyle");
		r && (n.styleId = r);
		const o = sn(e, "b"), i = sn(e, "bCs");
		void 0 === o && void 0 === i || (n.bold = !0 === o || !0 === i);
		const a = sn(e, "i"), s = sn(e, "iCs");
		void 0 === a && void 0 === s || (n.italic = !0 === a || !0 === s);
		const l = sn(e, "strike");
		void 0 !== l && (n.strike = l);
		const c = sn(e, "dstrike");
		void 0 !== c && (n.doubleStrike = c);
		const u = sn(e, "smallCaps");
		void 0 !== u && (n.smallCaps = u);
		const d = sn(e, "caps");
		void 0 !== d && (n.allCaps = d);
		const p = sn(e, "vanish");
		void 0 !== p && (n.hidden = p);
		const f = sn(e, "noProof");
		void 0 !== f && (n.noProof = f);
		const h = sn(e, "webHidden");
		void 0 !== h && (n.webHidden = h);
		const m = sn(e, "specVanish");
		void 0 !== m && (n.specVanish = m);
		const g = sn(e, "rtl");
		void 0 !== g && (n.rtl = g);
		const w = sn(e, "cs");
		void 0 !== w && (n.complexScript = w);
		const v = sn(e, "snapToGrid");
		void 0 !== v && (n.snapToGrid = v);
		const y = sn(e, "outline");
		void 0 !== y && (n.outline = y);
		const x = sn(e, "shadow");
		void 0 !== x && (n.shadow = x);
		const S = sn(e, "emboss");
		void 0 !== S && (n.emboss = S);
		const N = sn(e, "imprint");
		void 0 !== N && (n.imprint = N);
		const E = nn(Jt(e, Wt, "em"), "val");
		"dot" !== E && "comma" !== E && "circle" !== E && "underDot" !== E && "none" !== E || (n.emphasisMark = E);
		const k = nn(Jt(e, Wt, "fitText"), "val");
		if (k) {
			const e = Cn(k);
			void 0 !== e && e > 0 && (n.fitText = e);
		}
		const T = mr(Jt(e, Wt, "bdr"));
		T && (n.textBorder = T);
		const I = nn(Jt(e, Wt, "effect"), "val");
		I && (n.textEffect = I);
		const _ = nn(Jt(e, Wt, "w"), "val");
		if (_) {
			const e = Number(_);
			Number.isFinite(e) && e > 0 && (n.characterScale = e);
		}
		const C = nn(Jt(e, Wt, "spacing"), "val");
		if (C) {
			const e = Cn(C);
			void 0 !== e && (n.characterSpacing = e);
		}
		const A = nn(Jt(e, Wt, "position"), "val");
		if (A) {
			const e = Number(A);
			Number.isFinite(e) && (n.baselineShift = e / 2);
		}
		const R = nn(Jt(e, Wt, "kern"), "val");
		if (R) {
			const e = Number(R);
			Number.isFinite(e) && e >= 0 && (n.kerningThreshold = e / 2);
		}
		const $ = nn(Jt(e, Vt, "ligatures"), "val");
		"none" !== $ && "standard" !== $ && "contextual" !== $ && "historical" !== $ && "standardContextual" !== $ || (n.ligatures = $);
		const D = nn(Jt(e, Vt, "numSpacing"), "val");
		"proportional" !== D && "tabular" !== D || (n.numberSpacing = D);
		const P = nn(Jt(e, Vt, "numForm"), "val");
		"lining" !== P && "oldStyle" !== P || (n.numberForm = P);
		const M = nn(Jt(e, Vt, "stylisticSets"), "val");
		if (M) {
			const e = /^[0-9a-fA-F]+$/.test(M) && M.length > 2 ? Number.parseInt(M, 16) : Number(M);
			if (Number.isFinite(e) && e > 0) {
				for (let t = 1; t <= 20; t += 1) if (e & 1 << t - 1) {
					n.stylisticSet = t;
					break;
				}
			}
		}
		const F = nn(Jt(e, Vt, "cntxtAlts"), "val");
		null === F ? Jt(e, "http://schemas.microsoft.com/office/word/2010/wordml", "cntxtAlts") && (n.contextualAlternates = !0) : n.contextualAlternates = an(F);
		const O = Jt(e, Wt, "u"), L = nn(O, "val");
		if (O) {
			n.underline = "none" !== L, n.underlineStyle = "none" === L ? null : L || "single";
			const e = nn(O, "color");
			e && "auto" !== e && (n.underlineColor = An(e));
		}
		const B = nn(Jt(e, Wt, "vertAlign"), "val");
		"superscript" !== B && "subscript" !== B && "baseline" !== B || (n.superscript = "superscript" === B, n.subscript = "subscript" === B);
		const U = Jt(e, Wt, "rFonts"), z = nn(U, "ascii") ?? nn(U, "hAnsi") ?? nn(U, "cs") ?? nn(U, "eastAsia") ?? function(e, t) {
			const n = nn(e, "asciiTheme") ?? nn(e, "hAnsiTheme") ?? nn(e, "eastAsiaTheme") ?? nn(e, "cstheme");
			if (!n) return;
			const r = "majorAscii" === n || "majorHAnsi" === n ? "majorHAnsi" : "minorAscii" === n || "minorHAnsi" === n ? "minorHAnsi" : "majorEastAsia" === n ? "majorEastAsia" : "minorEastAsia" === n ? "minorEastAsia" : "majorBidi" === n ? "majorBidi" : "minorBidi" === n ? "minorBidi" : void 0;
			return r ? t[r] : void 0;
		}(U, t.fonts);
		z && (n.fontFamily = function(e) {
			const t = e?.trim();
			if (t) return `${/[\s,]/.test(t) ? `"${t.replace(/"/g, "\\\"")}"` : t}, ${/times/i.test(t) ? "serif" : "sans-serif"}`;
		}(z));
		const H = nn(Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "sz") ?? Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "szCs"), "val");
		if (H) {
			const e = function(e) {
				const t = e ? Number(e) : NaN;
				return Number.isFinite(t) ? In(t / 2 / 72 * 96, 4) : null;
			}(H);
			null !== e && (n.fontSize = e);
		}
		const j = Jt(e, Wt, "color"), q = nn(j, "val");
		if (q && "auto" !== q) n.color = An(q);
		else if ("auto" !== q) {
			const e = Mn(j, t.colors);
			e && (n.color = e);
		}
		const W = en(e, "textFill");
		if (W) {
			const e = xr(W);
			e && (n.textFill = e);
		}
		const G = en(e, "textOutline");
		if (G) {
			const e = G.getAttributeNS(Vt, "w"), t = null !== e ? Number(e) : NaN, r = { widthPt: Number.isFinite(t) && t > 0 ? t / re : .5 }, o = xr(G);
			o && (r.fill = o, "solid" === o.type ? r.color = o.color : "gradient" === o.type && o.stops[0] && (r.color = o.stops[0].color)), n.textOutline = r;
		}
		const V = en(e, "shadow");
		if (V) {
			const e = function(e) {
				const t = Sr(e);
				if (!t) return null;
				const n = e.getAttributeNS(Vt, "blurRad"), r = e.getAttributeNS(Vt, "dist"), o = e.getAttributeNS(Vt, "dir"), i = n ? Number(n) / re : 0, a = r ? Number(r) / re : 0, s = o ? Number(o) / ae : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					blurPt: i,
					distPt: a,
					dirDeg: s
				};
			}(V);
			e && (n.textShadow = e);
		}
		const X = en(e, "glow");
		if (X) {
			const e = function(e) {
				const t = Sr(e);
				if (!t) return null;
				const n = e.getAttributeNS(Vt, "rad"), r = n ? Number(n) / re : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					radiusPt: r
				};
			}(X);
			e && (n.glow = e);
		}
		const Z = en(e, "reflection");
		Z && (n.reflection = function(e) {
			const t = e.getAttributeNS(Vt, "blurRad"), n = e.getAttributeNS(Vt, "stA"), r = e.getAttributeNS(Vt, "stPos"), o = e.getAttributeNS(Vt, "endA"), i = e.getAttributeNS(Vt, "endPos"), a = e.getAttributeNS(Vt, "dist");
			return {
				blurPt: t ? Number(t) / re : 0,
				startAlpha: null !== n ? Number(n) / ie : .55,
				startPos: null !== r ? Number(r) / ie : 0,
				endAlpha: null !== o ? Number(o) / ie : 0,
				endPos: null !== i ? Number(i) / ie : 1,
				distPt: a ? Number(a) / re : 0
			};
		}(Z));
		const Y = en(e, "scene3d");
		Y && (n.scene3dXml = new b.XMLSerializer().serializeToString(Y));
		const Q = en(e, "props3d");
		Q && (n.props3dXml = new b.XMLSerializer().serializeToString(Q));
		const K = nn(Jt(e, Wt, "highlight"), "val");
		K && "none" !== K && (n.highlight = K);
		const J = yr(Jt(e, Wt, "shd"), t.colors);
		J && (n.shading = J);
		const ee = Jt(e, Wt, "lang");
		if (ee) {
			const e = nn(ee, "val"), t = nn(ee, "eastAsia"), r = nn(ee, "bidi"), o = {};
			e && (o.value = e), t && (o.eastAsia = t), r && (o.bidi = r), Object.keys(o).length > 0 && (n.language = o);
		}
		const te = Jt(e, Wt, "rPrChange"), ne = ir(te), oe = Jt(te, Wt, "rPr");
		return ne && oe && (n.propertyRevision = {
			...ne,
			type: "property",
			previous: Er(oe, t) ?? {}
		}), br(n);
	}
	const kr = [
		["firstRow", "firstRow"],
		["lastRow", "lastRow"],
		["firstColumn", "firstCol"],
		["lastColumn", "lastCol"],
		["oddVBand", "band1Vert"],
		["evenVBand", "band2Vert"],
		["oddHBand", "band1Horz"],
		["evenHBand", "band2Horz"],
		["firstRowFirstColumn", "nwCell"],
		["firstRowLastColumn", "neCell"],
		["lastRowFirstColumn", "swCell"],
		["lastRowLastColumn", "seCell"]
	], Tr = [
		["top", "borderTop"],
		["left", "borderLeft"],
		["bottom", "borderBottom"],
		["right", "borderRight"],
		["insideH", "borderInsideH"],
		["insideV", "borderInsideV"]
	];
	function Ir(e) {
		if (!e) return;
		const t = nn(e, "type"), n = nn(e, "w");
		if ("auto" === t) return "auto";
		if ("pct" === t) {
			if (!n) return;
			const e = n.trim().endsWith("%") ? Number.parseFloat(n) : Number(n) / 50;
			return Number.isFinite(e) ? `${In(e, 4)}%` : void 0;
		}
		return Cn(n);
	}
	function _r(e, t) {
		const n = nn(Jt(e, Wt, t), "val"), r = n ? Number(n) : NaN;
		return Number.isFinite(r) && r > 0 ? Math.floor(r) : void 0;
	}
	function Cr(e) {
		const t = Jt(e, Wt, "cnfStyle");
		if (!t) return;
		const n = nn(t, "val") ?? "", r = {};
		return kr.forEach(([e, o], i) => {
			const a = nn(t, e);
			"1" === a || "true" === a || "on" === a ? r[o] = !0 : "0" === a || "false" === a || "off" === a ? r[o] = !1 : 12 === n.length && "1" === n[i] && (r[o] = !0);
		}), Object.keys(r).length > 0 ? r : void 0;
	}
	function Ar(e) {
		const t = nn(e, "date"), n = t ? Date.parse(t) : NaN;
		return {
			id: nn(e, "id") ?? `revision:${e.localName}`,
			author: nn(e, "author") ?? "Unknown",
			date: Number.isFinite(n) ? n : 0
		};
	}
	function Rr(e) {
		if (!e) return;
		const t = Jt(e, Wt, "tblPrEx");
		return t ? {
			...Ar(e),
			type: "property",
			previous: Dr(t) ?? {}
		} : void 0;
	}
	function $r(e) {
		if (!e) return;
		const t = (t) => Cn(nn(Jt(e, Wt, t), "w")), n = {}, r = t("top"), o = t("right"), i = t("bottom"), a = t("left"), s = t("start"), l = t("end");
		return void 0 !== r && (n.top = r), void 0 !== o && (n.right = o), void 0 !== i && (n.bottom = i), void 0 !== a && (n.left = a), void 0 !== s && (n.start = s), void 0 !== l && (n.end = l), Object.keys(n).length > 0 ? n : void 0;
	}
	function Dr(e, t) {
		const n = {};
		t && (n.styleId = t);
		const r = nn(Jt(e, Wt, "tblCaption"), "val");
		r && (n.altTitle = r);
		const o = nn(Jt(e, Wt, "tblDescription"), "val");
		o && (n.altDescription = o);
		const i = Ir(Jt(e, Wt, "tblW"));
		void 0 !== i && (n.width = i);
		const a = Ir(Jt(e, Wt, "tblInd"));
		void 0 !== a && (n.indentLeft = a);
		const s = nn(Jt(e, Wt, "jc"), "val");
		"left" === s || "start" === s ? n.align = "left" : "center" === s ? n.align = "center" : "right" !== s && "end" !== s || (n.align = "right");
		const l = function(e) {
			const t = nn(Jt(e, Wt, "tblLayout"), "type");
			return "fixed" === t || "autofit" === t ? t : void 0;
		}(e);
		l && (n.layout = l);
		const c = Ir(Jt(e, Wt, "tblCellSpacing"));
		void 0 !== c && (n.cellSpacing = c);
		const u = (d = Jt(e, Wt, "tblBorders")) ? {
			...gr(d),
			borderInsideH: mr(Jt(d, Wt, "insideH")),
			borderInsideV: mr(Jt(d, Wt, "insideV"))
		} : {};
		var d;
		Object.keys(u).length > 0 && (n.borders = u);
		const p = $r(Jt(e, Wt, "tblCellMar"));
		p && (n.defaultCellMargins = p);
		const f = e ? sn(e, "bidiVisual") : void 0;
		void 0 !== f && (n.bidiVisual = f);
		const h = nn(Jt(e, Wt, "tblOverlap"), "val");
		"overlap" !== h && "never" !== h || (n.tblOverlap = h);
		const m = function(e) {
			const t = Jt(e, Wt, "tblpPr");
			if (!t || !t.attributes || 0 === t.attributes.length) return;
			const n = {};
			for (let l = 0; l < t.attributes.length; l += 1) {
				const e = t.attributes.item(l);
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e?.namespaceURI && "w" !== e?.prefix || (n[e.localName || e.name.replace(/^w:/, "")] = e.value);
			}
			const r = (e) => Cn(n[e] ?? null), o = "margin" === n.horzAnchor || "page" === n.horzAnchor || "text" === n.horzAnchor ? n.horzAnchor : void 0, i = "margin" === n.vertAnchor || "page" === n.vertAnchor || "text" === n.vertAnchor ? n.vertAnchor : void 0, a = "left" === n.tblpXSpec || "center" === n.tblpXSpec || "right" === n.tblpXSpec || "inside" === n.tblpXSpec || "outside" === n.tblpXSpec ? n.tblpXSpec : void 0, s = "top" === n.tblpYSpec || "center" === n.tblpYSpec || "bottom" === n.tblpYSpec || "inside" === n.tblpYSpec || "outside" === n.tblpYSpec ? n.tblpYSpec : void 0;
			return {
				...o ? { horizontalAnchor: o } : {},
				...i ? { verticalAnchor: i } : {},
				...void 0 !== r("tblpX") ? { x: r("tblpX") } : {},
				...void 0 !== r("tblpY") ? { y: r("tblpY") } : {},
				...a ? { xAlign: a } : {},
				...s ? { yAlign: s } : {},
				...void 0 !== r("topFromText") ? { distanceTop: r("topFromText") } : {},
				...void 0 !== r("rightFromText") ? { distanceRight: r("rightFromText") } : {},
				...void 0 !== r("bottomFromText") ? { distanceBottom: r("bottomFromText") } : {},
				...void 0 !== r("leftFromText") ? { distanceLeft: r("leftFromText") } : {}
			};
		}(e);
		m && (n.floating = m);
		const g = _r(e, "tblStyleRowBandSize");
		void 0 !== g && (n.rowBandSize = g);
		const w = _r(e, "tblStyleColBandSize");
		void 0 !== w && (n.colBandSize = w);
		const b = Jt(e, Wt, "tblLook");
		if (b) {
			const e = nn(b, "val"), t = e ? Number.parseInt(e, 16) : NaN, r = (e, n, r) => {
				const o = nn(b, e);
				return null !== o && "" !== o ? "1" === o || "true" === o || "on" === o : Number.isFinite(t) ? 0 !== (t & n) : r;
			};
			n.tblLook = {
				firstRow: r("firstRow", 32, !0),
				lastRow: r("lastRow", 64, !1),
				firstCol: r("firstColumn", 128, !0),
				lastCol: r("lastColumn", 256, !1),
				noHBand: r("noHBand", 512, !1),
				noVBand: r("noVBand", 1024, !1)
			};
		}
		const v = Jt(e, Wt, "tblPrChange"), y = Jt(v, Wt, "tblPr");
		return v && y && (n.revision = {
			...Ar(v),
			type: "property",
			previous: Dr(y) ?? {}
		}), br(n);
	}
	function Pr(e) {
		if (!e) return;
		const t = {}, n = sn(e, "tblHeader");
		void 0 !== n && (t.isHeader = n);
		const r = _r(e, "gridBefore");
		void 0 !== r && (t.gridBefore = r);
		const o = _r(e, "gridAfter");
		void 0 !== o && (t.gridAfter = o);
		const i = Ir(Jt(e, Wt, "wBefore"));
		void 0 !== i && (t.widthBefore = i);
		const a = Ir(Jt(e, Wt, "wAfter"));
		void 0 !== a && (t.widthAfter = a);
		const s = Jt(e, Wt, "trHeight"), l = Cn(nn(s, "val"));
		void 0 !== l && (t.height = l);
		const c = nn(s, "hRule");
		"auto" !== c && "exact" !== c && "atLeast" !== c || (t.heightRule = c);
		const u = Ir(Jt(e, Wt, "tblCellSpacing"));
		void 0 !== u && (t.cellSpacing = u);
		const d = nn(Jt(e, Wt, "jc"), "val");
		"left" === d || "start" === d ? t.align = "left" : "center" === d ? t.align = "center" : "right" !== d && "end" !== d || (t.align = "right");
		const p = sn(e, "cantSplit");
		void 0 !== p && (t.cantSplit = p);
		const f = sn(e, "hidden");
		void 0 !== f && (t.hidden = f);
		const h = Jt(e, Wt, "trPrChange"), m = Jt(h, Wt, "trPr");
		h && m && (t.propertyRevision = {
			...Ar(h),
			type: "property",
			previous: Pr(m) ?? {}
		});
		const g = Jt(e, Wt, "ins"), w = Jt(e, Wt, "del"), b = g ?? w;
		return b && (t.revision = {
			...Ar(b),
			type: g ? "insert" : "delete"
		}), br(t);
	}
	function Mr(e) {
		if (!e) return 1;
		const t = nn(Jt(e, Wt, "gridSpan"), "val"), n = t ? Number(t) : 1;
		return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
	}
	function Fr(e) {
		if (!e) return;
		const t = Jt(e, Wt, "vMerge");
		return t ? "restart" === nn(t, "val") ? "restart" : "continue" : void 0;
	}
	function Or(e) {
		if (!e) return;
		const t = Jt(e, Wt, "hMerge");
		return t ? "restart" === nn(t, "val") ? "restart" : "continue" : void 0;
	}
	function Lr(e, t, n) {
		if (!e) {
			if (!t) return;
			return br({
				paddingTop: t.top,
				paddingRight: t.right,
				paddingBottom: t.bottom,
				paddingLeft: t.left,
				paddingStart: t.start,
				paddingEnd: t.end
			});
		}
		const r = {
			...void 0 !== t?.top ? { paddingTop: t.top } : {},
			...void 0 !== t?.right ? { paddingRight: t.right } : {},
			...void 0 !== t?.bottom ? { paddingBottom: t.bottom } : {},
			...void 0 !== t?.left ? { paddingLeft: t.left } : {},
			...void 0 !== t?.start ? { paddingStart: t.start } : {},
			...void 0 !== t?.end ? { paddingEnd: t.end } : {}
		}, o = yr(Jt(e, Wt, "shd"), n);
		o && (r.shading = o);
		const i = Jt(e, Wt, "tcW"), a = nn(i, "type"), s = nn(i, "w");
		if ("dxa" === a) {
			const e = Cn(s);
			void 0 !== e && (r.width = e);
		} else if ("pct" === a && s) {
			const e = Number(s);
			Number.isFinite(e) && (r.width = `${In(e / 50, 4)}%`);
		}
		const l = $r(Jt(e, Wt, "tcMar"));
		l && (void 0 !== l.top && (r.paddingTop = l.top), void 0 !== l.bottom && (r.paddingBottom = l.bottom), void 0 !== l.left && (r.paddingLeft = l.left), void 0 !== l.right && (r.paddingRight = l.right), void 0 !== l.start && (r.paddingStart = l.start), void 0 !== l.end && (r.paddingEnd = l.end));
		const c = function(e) {
			if (!e) return;
			const t = nn(Jt(e, Wt, "vAlign"), "val");
			return "top" === t || "bottom" === t ? t : "center" === t ? "middle" : void 0;
		}(e);
		c && (r.verticalAlign = c);
		const u = Kt(nn(Jt(e, Wt, "textDirection"), "val"));
		u && (r.textDirection = u);
		const d = sn(e, "noWrap");
		void 0 !== d && (r.noWrap = d);
		const p = sn(e, "tcFitText");
		void 0 !== p && (r.fitText = p);
		const f = sn(e, "hideMark");
		void 0 !== f && (r.hideMark = f);
		const h = nn(Jt(e, Wt, "headers"), "val");
		h && (r.headers = h);
		const m = Jt(e, Wt, "tcPrChange"), g = Jt(m, Wt, "tcPr");
		m && g && (r.propertyRevision = {
			...Ar(m),
			type: "property",
			previous: Lr(g, void 0, n) ?? {}
		});
		const w = Jt(e, Wt, "cellIns"), b = Jt(e, Wt, "cellDel"), v = Jt(e, Wt, "cellMerge"), y = w ?? b ?? v;
		if (y) {
			const e = function(e) {
				return "rest" === e || "restart" === e ? "restart" : "cont" === e || "continue" === e ? "continue" : void 0;
			}(nn(y, "vMergeOrig"));
			r.revision = {
				...Ar(y),
				type: w ? "insert" : b ? "delete" : "merge",
				...v && e ? { previous: { vMerge: e } } : {}
			};
		}
		for (const [x, S] of Object.entries(function(e) {
			return e ? gr(Jt(e, Wt, "tcBorders")) : {};
		}(e))) S && (r[x] = S);
		return br(r);
	}
	function Br(e) {
		const t = Jt(e, Wt, "trPr");
		return !!t && !0 === sn(t, "tblHeader");
	}
	function Ur(e) {
		if (!e) return;
		const t = De(e, de), n = De(void 0, de);
		return wr({
			styleId: e.styleId,
			align: t.align !== n.align ? t.align : void 0,
			spacingBefore: t.spacingBefore !== n.spacingBefore ? t.spacingBefore : void 0,
			spacingAfter: t.spacingAfter !== n.spacingAfter ? t.spacingAfter : void 0,
			contextualSpacing: void 0 !== e.contextualSpacing || t.contextualSpacing !== n.contextualSpacing ? t.contextualSpacing : void 0,
			lineHeight: t.lineHeight !== n.lineHeight ? t.lineHeight : void 0,
			lineRule: t.lineRule ?? void 0,
			lineGridPitch: e.lineGridPitch ?? void 0,
			snapToGrid: void 0 !== e.snapToGrid || t.snapToGrid !== n.snapToGrid ? t.snapToGrid : void 0,
			indentLeft: void 0 !== e.indentLeft || t.indentLeft !== n.indentLeft ? t.indentLeft : void 0,
			indentRight: void 0 !== e.indentRight || t.indentRight !== n.indentRight ? t.indentRight : void 0,
			indentFirstLine: void 0 !== e.indentFirstLine || t.indentFirstLine !== n.indentFirstLine ? t.indentFirstLine : void 0,
			indentHanging: void 0 !== e.indentHanging || t.indentHanging !== n.indentHanging ? t.indentHanging : void 0,
			mirrorIndents: void 0 !== e.mirrorIndents || t.mirrorIndents !== n.mirrorIndents ? t.mirrorIndents : void 0,
			pageBreakBefore: void 0 !== e.pageBreakBefore || t.pageBreakBefore !== n.pageBreakBefore ? t.pageBreakBefore : void 0,
			keepWithNext: void 0 !== e.keepWithNext || t.keepWithNext !== n.keepWithNext ? t.keepWithNext : void 0,
			keepLinesTogether: void 0 !== e.keepLinesTogether || t.keepLinesTogether !== n.keepLinesTogether ? t.keepLinesTogether : void 0,
			widowControl: void 0 !== e.widowControl || t.widowControl !== n.widowControl ? t.widowControl : void 0,
			shading: e.shading ?? void 0,
			borderTop: e.borderTop ?? void 0,
			borderRight: e.borderRight ?? void 0,
			borderBottom: e.borderBottom ?? void 0,
			borderLeft: e.borderLeft ?? void 0,
			tabs: e.tabs ?? void 0,
			textDirection: e.textDirection ?? void 0,
			outlineLevel: e.outlineLevel ?? void 0,
			suppressLineNumbers: void 0 !== e.suppressLineNumbers || t.suppressLineNumbers !== n.suppressLineNumbers ? t.suppressLineNumbers : void 0,
			suppressAutoHyphens: void 0 !== e.suppressAutoHyphens || t.suppressAutoHyphens !== n.suppressAutoHyphens ? t.suppressAutoHyphens : void 0,
			bidi: void 0 !== e.bidi || t.bidi !== n.bidi ? t.bidi : void 0,
			kinsoku: void 0 !== e.kinsoku || t.kinsoku !== n.kinsoku ? t.kinsoku : void 0,
			wordWrap: void 0 !== e.wordWrap || t.wordWrap !== n.wordWrap ? t.wordWrap : void 0,
			overflowPunct: void 0 !== e.overflowPunct || t.overflowPunct !== n.overflowPunct ? t.overflowPunct : void 0,
			topLinePunct: void 0 !== e.topLinePunct || t.topLinePunct !== n.topLinePunct ? t.topLinePunct : void 0,
			autoSpaceDE: void 0 !== e.autoSpaceDE || t.autoSpaceDE !== n.autoSpaceDE ? t.autoSpaceDE : void 0,
			autoSpaceDN: void 0 !== e.autoSpaceDN || t.autoSpaceDN !== n.autoSpaceDN ? t.autoSpaceDN : void 0,
			adjustRightInd: void 0 !== e.adjustRightInd || t.adjustRightInd !== n.adjustRightInd ? t.adjustRightInd : void 0,
			textAlignment: e.textAlignment ?? void 0,
			textboxTightWrap: e.textboxTightWrap ?? void 0,
			divId: e.divId ?? void 0,
			conditionalStyle: e.conditionalStyle ?? void 0,
			borderBetween: e.borderBetween ?? void 0,
			borderBar: e.borderBar ?? void 0,
			framePrXml: e.framePrXml ?? void 0,
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: Ur(e.propertyRevision.previous) ?? {}
			} : void 0
		});
	}
	function zr(e) {
		return void 0 !== e?.lineHeight ? e : {
			...e ?? {},
			lineHeight: 1.1
		};
	}
	function Hr(e, t) {
		if (!e) return;
		const n = {}, r = ln(e, "pStyle");
		r && (n.styleId = r);
		const o = nn(Jt(e, Wt, "jc"), "val");
		"left" === o || "start" === o || "center" === o || "right" === o || "end" === o || "justify" === o ? n.align = "start" === o ? "left" : "end" === o ? "right" : o : "both" !== o && "distribute" !== o || (n.align = "justify");
		const i = Jt(e, Wt, "spacing"), a = nn(i, "before"), s = nn(i, "after"), l = nn(i, "line"), c = nn(i, "lineRule");
		a && (n.spacingBefore = _n(a, 0)), s && (n.spacingAfter = _n(s, 0)), l && ("exact" === c || "atLeast" === c ? (n.lineHeight = In(Number(l) / 1440 * 96, 4), n.lineRule = c) : n.lineHeight = Number(l) / 240);
		const u = sn(e, "contextualSpacing");
		void 0 !== u && (n.contextualSpacing = u);
		const d = sn(e, "snapToGrid");
		void 0 !== d && (n.snapToGrid = d);
		const p = Jt(e, Wt, "ind"), f = nn(p, "start") ?? nn(p, "left"), h = nn(p, "end") ?? nn(p, "right"), m = nn(p, "firstLine"), g = nn(p, "hanging");
		f && (n.indentLeft = _n(f, 0)), h && (n.indentRight = _n(h, 0)), g ? (n.indentHanging = _n(g, 0), n.indentFirstLine = void 0) : m && (n.indentFirstLine = _n(m, 0));
		const w = function(e) {
			const t = Jt(e, Wt, "tabs");
			if (!t) return [];
			const n = [];
			for (const r of Yt(t, Wt, "tab")) {
				const e = Cn(nn(r, "pos"));
				if (void 0 === e) continue;
				const t = nn(r, "val"), o = "center" === t || "right" === t || "decimal" === t || "bar" === t || "clear" === t ? t : "left", i = nn(r, "leader"), a = "dot" === i || "hyphen" === i || "underscore" === i || "heavy" === i || "middleDot" === i ? i : "none" === i ? "none" : void 0;
				n.push({
					position: e,
					type: o,
					...void 0 !== a ? { leader: a } : {}
				});
			}
			return n;
		}(e);
		w.length > 0 && (n.tabs = w);
		const v = sn(e, "pageBreakBefore");
		void 0 !== v && (n.pageBreakBefore = v);
		const y = sn(e, "keepNext");
		void 0 !== y && (n.keepWithNext = y);
		const x = sn(e, "keepLines");
		void 0 !== x && (n.keepLinesTogether = x);
		const S = sn(e, "widowControl");
		void 0 !== S && (n.widowControl = S);
		const N = sn(e, "mirrorIndents");
		void 0 !== N && (n.mirrorIndents = N);
		const E = Jt(e, Wt, "pBdr");
		if (E) {
			const { borderTop: e, borderRight: t, borderBottom: r, borderLeft: o, borderBetween: i, borderBar: a } = gr(E);
			e && (n.borderTop = e), t && (n.borderRight = t), r && (n.borderBottom = r), o && (n.borderLeft = o), i && (n.borderBetween = i), a && (n.borderBar = a);
		}
		const k = yr(Jt(e, Wt, "shd"), t);
		k && (n.shading = k);
		const T = Kt(nn(Jt(e, Wt, "textDirection"), "val"));
		T && (n.textDirection = T);
		const I = nn(Jt(e, Wt, "outlineLvl"), "val");
		if (null != I && /^[0-9]$/.test(I.trim())) {
			const e = Number(I);
			Number.isInteger(e) && e >= 0 && e <= 9 && (n.outlineLevel = e);
		}
		const _ = sn(e, "suppressLineNumbers");
		void 0 !== _ && (n.suppressLineNumbers = _);
		const C = sn(e, "suppressAutoHyphens");
		void 0 !== C && (n.suppressAutoHyphens = C);
		const A = sn(e, "bidi");
		void 0 !== A && (n.bidi = A);
		const R = sn(e, "kinsoku");
		void 0 !== R && (n.kinsoku = R);
		const $ = sn(e, "wordWrap");
		void 0 !== $ && (n.wordWrap = $);
		const D = sn(e, "overflowPunct");
		void 0 !== D && (n.overflowPunct = D);
		const P = sn(e, "topLinePunct");
		void 0 !== P && (n.topLinePunct = P);
		const M = sn(e, "autoSpaceDE");
		void 0 !== M && (n.autoSpaceDE = M);
		const F = sn(e, "autoSpaceDN");
		void 0 !== F && (n.autoSpaceDN = F);
		const O = sn(e, "adjustRightInd");
		void 0 !== O && (n.adjustRightInd = O);
		const L = nn(Jt(e, Wt, "textAlignment"), "val");
		"auto" !== L && "top" !== L && "center" !== L && "baseline" !== L && "bottom" !== L || (n.textAlignment = L);
		const B = nn(Jt(e, Wt, "textboxTightWrap"), "val");
		"none" !== B && "allLines" !== B && "firstLineOnly" !== B && "firstLastLine" !== B || (n.textboxTightWrap = B);
		const U = nn(Jt(e, Wt, "divId"), "val");
		if (null !== U) {
			const e = Number(U);
			Number.isFinite(e) && e >= 0 && (n.divId = Math.floor(e));
		}
		const z = Cr(e);
		z && (n.conditionalStyle = z);
		const H = Jt(e, Wt, "framePr");
		if (H) {
			const e = nn(H, "dropCap");
			e && "none" !== e || (n.framePrXml = new b.XMLSerializer().serializeToString(H));
		}
		const j = Jt(e, Wt, "pPrChange"), q = ir(j), W = Jt(j, Wt, "pPr");
		return q && W && (n.propertyRevision = {
			...q,
			type: "property",
			previous: Hr(W, t) ?? {}
		}), br(n);
	}
	const jr = {
		width: 816,
		height: 1056,
		orientation: "portrait",
		margins: {
			top: 96,
			right: 96,
			bottom: 96,
			left: 96,
			header: 48,
			footer: 48,
			gutter: 0
		}
	};
	function qr(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function Wr(e) {
		const t = Jt(e, Wt, "cols");
		if (!t) return;
		const n = Number.parseInt(nn(t, "num") ?? "1", 10);
		if (!Number.isFinite(n) || n <= 1) return;
		const r = _n(nn(t, "space"), 0), o = nn(t, "sep"), i = nn(t, "equalWidth"), a = Yt(t, Wt, "col").map((e) => ({
			width: _n(nn(e, "w"), 0),
			space: _n(nn(e, "space"), r)
		})), s = null == i || qr(i);
		return {
			count: n,
			space: r,
			...qr(o) ? { separator: !0 } : {},
			...s ? {} : { equalWidth: !1 },
			...!s && a.length > 0 ? { columns: a } : {}
		};
	}
	function Gr(e) {
		const t = Jt(e, Wt, "pgSz"), n = Jt(e, Wt, "pgMar"), r = Wr(e), i = Jt(Jt(e, Wt, "pgBorders"), Wt, "top"), a = nn(i, "val"), s = nn(i, "color"), l = Number.parseInt(nn(i, "sz") ?? "0", 10), c = a && s && "nil" !== a ? {
			style: "double" === a || "dashed" === a || "dotted" === a ? a : "single",
			color: `#${s.replace(/^#/, "")}`,
			width: Number.isFinite(l) && l > 0 ? l / 8 : 1,
			distance: Number(nn(i, "space") ?? 0)
		} : void 0;
		let u;
		if (t || n || r) {
			const e = _n(nn(t, "w"), 816), o = _n(nn(t, "h"), 1056), i = nn(t, "orient");
			u = {
				width: e,
				height: o,
				orientation: "landscape" === i ? "landscape" : "portrait" === i ? "portrait" : e > o ? "landscape" : "portrait",
				margins: {
					top: _n(nn(n, "top"), 96),
					right: _n(nn(n, "right"), 96),
					bottom: _n(nn(n, "bottom"), 96),
					left: _n(nn(n, "left"), 96),
					header: _n(nn(n, "header"), 48),
					footer: _n(nn(n, "footer"), 48),
					gutter: _n(nn(n, "gutter"), 0)
				},
				...r ? { columns: r } : {}
			};
		}
		const d = (t) => {
			const n = {};
			for (const r of Yt(e, Wt, t)) {
				const e = r.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "type") || "default";
				if ("default" !== e && "first" !== e && "even" !== e) continue;
				const t = r.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
				t && (n[e] = t);
			}
			return n;
		}, p = d("headerReference"), f = d("footerReference"), h = Jt(e, Wt, "docGrid"), m = nn(h, "type"), g = _n(nn(h, "linePitch"), NaN), w = nn(Jt(e, Wt, "type"), "val"), b = "continuous" === w || "nextPage" === w || "evenPage" === w || "oddPage" === w || "nextColumn" === w ? w : void 0, v = Jt(e, Wt, "pgNumType");
		let y;
		if (v) {
			const e = nn(v, "start"), t = null !== e ? Number.parseInt(e, 10) : void 0, n = nn(v, "fmt") ?? void 0, r = nn(v, "chapStyle") ?? void 0, o = nn(v, "chapSep") ?? void 0;
			(void 0 !== t && Number.isFinite(t) || n || r || o) && (y = {
				...void 0 !== t && Number.isFinite(t) ? { start: t } : {},
				...n ? { format: n } : {},
				...r ? { chapterStyle: r } : {},
				...o ? { chapterSeparator: o } : {}
			});
		}
		const x = nn(Jt(e, Wt, "vAlign"), "val"), S = "center" === x || "both" === x || "bottom" === x ? x : void 0, N = sn(e, "bidi"), E = Jt(e, Wt, "sectPrChange"), k = ir(E), T = Jt(E, Wt, "sectPr"), I = k && T ? {
			...k,
			type: "property",
			previous: (_ = Gr(T), C = u, {
				pageSettings: _.pageSettings ?? C ?? jr,
				..._.pageBorder ? { pageBorder: _.pageBorder } : {},
				..._.pageNumbering ? { pageNumbering: _.pageNumbering } : {},
				..._.verticalAlignment ? { verticalAlignment: _.verticalAlignment } : {},
				...void 0 !== _.bidi ? { bidi: _.bidi } : {},
				..._.breakType ? { nextBreakType: _.breakType } : {}
			})
		} : void 0;
		var _, C;
		return {
			pageSettings: u,
			...c ? { pageBorder: c } : {},
			headerRIds: p,
			footerRIds: f,
			docGridLinePitchPx: Number.isFinite(g) && g > 0 ? g : void 0,
			docGridMode: "lines" === m || "linesAndChars" === m ? "explicit" : void 0,
			docGridType: m,
			breakType: b,
			pageNumbering: y,
			verticalAlignment: S,
			bidi: N,
			propertyRevision: I
		};
	}
	function Vr(e) {
		if (!e) return;
		const t = Jt(e, Wt, "sectPr");
		if (!t) return;
		const n = Jt(t, Wt, "pgSz"), r = Jt(t, Wt, "pgMar"), o = Wr(t);
		if (!n && !r && !o) return;
		const i = _n(nn(n, "w"), 816), a = _n(nn(n, "h"), 1056), s = nn(n, "orient");
		return {
			width: i,
			height: a,
			orientation: "landscape" === s ? "landscape" : "portrait" === s ? "portrait" : i > a ? "landscape" : "portrait",
			margins: {
				top: _n(nn(r, "top"), 96),
				right: _n(nn(r, "right"), 96),
				bottom: _n(nn(r, "bottom"), 96),
				left: _n(nn(r, "left"), 96),
				header: _n(nn(r, "header"), 48),
				footer: _n(nn(r, "footer"), 48),
				gutter: _n(nn(r, "gutter"), 0)
			},
			...o ? { columns: o } : {}
		};
	}
	function Xr(e, t, n, r, o) {
		if (t && n) for (const i of e) {
			if ("paragraph" === i.type) {
				const e = i.style?.styleId && /heading/i.test(i.style.styleId);
				void 0 !== i.style?.lineHeight || !1 === i.style?.snapToGrid || e || (i.style = {
					...i.style ?? {},
					lineGridPitch: t,
					lineGridType: r
				});
				continue;
			}
			if (o.adjustLineHeightInTable) for (const e of i.rows) for (const i of e.cells) Xr(i.blocks, t, n, r, o);
		}
	}
	function Zr(e) {
		const t = e[0];
		return e.every((e) => {
			return !(e.bookmark || e.comment || e.opaque || e.image || e.textBox || e.math || e.sym || e.footnoteReference || e.endnoteReference || e.revision || e.revisionRangeMarker || e.sdtWrappers?.length || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.styles?.link || (n = t?.styles, r = e.styles, JSON.stringify(n ?? null) !== JSON.stringify(r ?? null)));
			var n, r;
		});
	}
	const Yr = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Qr = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", Kr = "http://schemas.openxmlformats.org/drawingml/2006/main", Jr = "http://schemas.openxmlformats.org/markup-compatibility/2006", eo = "http://www.w3.org/2000/xmlns/", to = "urn:schemas-microsoft-com:office:office", no = "urn:schemas-microsoft-com:vml", ro = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape", oo = "http://schemas.openxmlformats.org/drawingml/2006/chart", io = "http://schemas.openxmlformats.org/drawingml/2006/diagram", ao = (e) => Array.from(e.childNodes).filter((e) => 1 === e.nodeType), so = (e, t, n) => Array.from(e.getElementsByTagNameNS(t, n)), lo = (e, t, n) => e.namespaceURI === t && e.localName === n, co = (e, t) => e < t ? -1 : e > t ? 1 : 0, uo = (e, t) => Object.hasOwn(e, t);
	function po(e) {
		if (lo(e, Yr, "object")) return "embedded";
		if (lo(e, Yr, "pict")) return so(e, to, "OLEObject").length ? "embedded" : so(e, no, "imagedata").length ? void 0 : "vml";
		if (!lo(e, Yr, "drawing")) return;
		const t = so(e, Kr, "graphicData");
		if (!t.length) return "drawing";
		for (const n of t) {
			const e = n.getAttribute("uri");
			if (e === oo || so(n, oo, "chart").length) return "chart";
			if (e === io || so(n, io, "relIds").length) return "diagram";
			if (e && /ink/i.test(e)) return "ink";
			if ("http://schemas.openxmlformats.org/drawingml/2006/picture" !== e && e !== ro) return "drawing";
		}
	}
	function fo(e) {
		const t = [], n = [e];
		for (; n.length;) {
			const e = n.pop();
			for (const n of Array.from(e.attributes)) ("http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI || "http://purl.oclc.org/ooxml/officeDocument/relationships" === n.namespaceURI || n.namespaceURI === to && "relid" === n.localName) && n.value && t.push(n.value);
			n.push(...ao(e));
		}
		return [...new Set(t)].sort(co);
	}
	function ho(e, t) {
		const n = t ? "xmlns:" + t : "xmlns";
		for (let r = e; r; r = 1 === r.parentNode?.nodeType ? r.parentNode : null) if (r.hasAttribute(n)) return r.getAttribute(n) ?? "";
		return "xml" === t ? "http://www.w3.org/XML/1998/namespace" : "";
	}
	function mo(e) {
		const t = Array.from(e.attributes).filter((e) => e.namespaceURI !== eo && "xmlns" !== e.name && "xmlns" !== e.prefix).map((t) => {
			const n = t.namespaceURI === Jr || lo(e, Jr, "Choice") && "Requires" === t.localName ? t.value.trim().split(/\s+/).filter(Boolean).map((t) => [t, ho(e, t.split(":")[0])]) : void 0;
			return [
				t.namespaceURI ?? "",
				t.localName ?? t.name,
				t.value,
				n
			];
		}).sort((e, t) => co(JSON.stringify(e), JSON.stringify(t)));
		return [
			e.namespaceURI ?? "",
			e.localName,
			t,
			Array.from(e.childNodes).map((e) => 1 === e.nodeType ? mo(e) : [e.nodeType, e.nodeValue])
		];
	}
	function go(e) {
		const t = e.cloneNode(!0), n = /* @__PURE__ */ new Map();
		for (let r = e; r; r = 1 === r.parentNode?.nodeType ? r.parentNode : null) for (const e of Array.from(r.attributes)) e.namespaceURI !== eo && "xmlns" !== e.name && "xmlns" !== e.prefix || n.has(e.name) || n.set(e.name, e.value);
		for (const [r, o] of n) t.hasAttribute(r) || t.setAttributeNS(eo, r, o);
		return new b.XMLSerializer().serializeToString(t);
	}
	function wo(e) {
		const t = so(e, Qr, "anchor")[0] ?? so(e, Qr, "inline")[0];
		if (!t) return;
		const n = ao(t).find((e) => lo(e, Qr, "extent")), r = (e) => {
			const t = n?.getAttribute(e), r = t ? Number(t) : NaN;
			return Number.isSafeInteger(r) && r > 0 ? r : void 0;
		}, o = ao(t).find((e) => e.namespaceURI === Qr && e.localName?.startsWith("wrap"))?.localName;
		return {
			placement: "anchor" === t.localName ? "anchor" : "inline",
			widthEmu: r("cx"),
			heightEmu: r("cy"),
			wrap: o ?? void 0,
			relativeHeight: t.getAttribute("relativeHeight") || void 0
		};
	}
	function bo(e, t, n) {
		const r = [], o = [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), s = n.map((e) => ({
			ownerPath: t,
			id: e
		})), l = (e, t, n, r) => o.push({
			level: "error",
			code: e,
			message: t,
			partPath: n,
			relationshipId: r
		});
		for (let c = 0; c < s.length; c++) {
			const t = s[c], n = JSON.stringify([t.ownerPath, t.id]);
			if (a.has(n)) continue;
			a.add(n);
			const o = ((uo(e.parts, t.ownerPath) ? e.parts[t.ownerPath] : void 0)?.relationships ?? []).filter((e) => e.id === t.id);
			if (1 !== o.length) {
				l(o.length ? "opaque-relationship-ambiguous" : "opaque-relationship-missing", "Cannot resolve unique opaque object relationship.", t.ownerPath, t.id);
				continue;
			}
			const u = o[0], d = u.targetMode ?? "Internal";
			if (r.push({
				ownerPath: t.ownerPath,
				relationshipId: u.id,
				type: u.type,
				target: u.target,
				targetMode: d,
				resolvedTarget: u.resolvedTarget
			}), "External" === d) continue;
			if (!u.resolvedTarget || !uo(e.parts, u.resolvedTarget)) {
				l("opaque-target-missing", "Opaque object internal target is absent or unsafe.", t.ownerPath, t.id);
				continue;
			}
			const p = u.resolvedTarget;
			if (!i.has(p)) {
				i.add(p);
				for (const t of e.parts[p].relationships ?? []) s.push({
					ownerPath: p,
					id: t.id
				});
			}
		}
		return {
			edges: r.sort((e, t) => co(JSON.stringify([e.ownerPath, e.relationshipId]), JSON.stringify([t.ownerPath, t.relationshipId]))),
			partPaths: [...i].sort(co),
			issues: o
		};
	}
	function vo(e, t) {
		if (t === e.mainDocumentPart) return !0;
		const n = e.parts[t]?.contentType ?? "";
		return /wordprocessingml\.(?:header|footer|footnotes|endnotes|comments|document\.glossary)\+xml$/.test(n);
	}
	function yo(e) {
		const t = ao(e);
		return lo(e, Jr, "AlternateContent") && t.filter((e) => lo(e, Jr, "Choice")).some((e) => so(e, Kr, "graphicData").some((e) => e.getAttribute("uri") === ro && so(e, ro, "wsp").length > 0 && so(e, Yr, "txbxContent").length > 0)) ? t.filter((e) => {
			if (!lo(e, Jr, "Fallback")) return !0;
			const t = ao(e);
			if (1 !== t.length || !lo(t[0], Yr, "pict")) return !0;
			const n = t[0];
			return !(so(n, no, "textbox").length > 0 && so(n, Yr, "txbxContent").length > 0 && 0 === so(n, to, "OLEObject").length && 0 === so(n, Yr, "object").length && 0 === so(n, Yr, "drawing").length);
		}) : t;
	}
	function xo(e) {
		return lo(e, Jr, "AlternateContent") ? yo(e).flatMap((e) => [
			"drawing",
			"pict",
			"object"
		].flatMap((t) => so(e, Yr, t))).map(po).find((e) => void 0 !== e) : po(e);
	}
	function So(e) {
		const t = xo(e);
		if (!t) return;
		const n = wo(e), r = (e, t) => void 0 === e ? t : Math.max(1, Math.min(4096, e / 9525));
		return {
			objectKind: t,
			fragmentXml: go(e),
			signature: JSON.stringify(mo(e)),
			relationshipIds: fo(e),
			width: r(n?.widthEmu, 180),
			height: r(n?.heightEmu, 90),
			placement: n?.placement
		};
	}
	function No(e) {
		const t = [], n = [];
		for (const o of Object.keys(e.parts).sort(co)) {
			const i = e.parts[o];
			if (vo(e, o) && "xml" === i.kind && /<(?:[\w.-]+:)?(?:drawing|pict|object)(?=[\s/>])/.test(i.data)) try {
				if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(i.data)) throw Error("DTD/entity declaration unsupported");
				const r = new b.DOMParser().parseFromString(i.data, "application/xml").documentElement;
				if (!r) throw Error("Missing story root");
				const a = [r];
				let s = 0;
				for (; a.length;) {
					const r = a.pop(), i = xo(r);
					if (!i) {
						a.push(...yo(r).reverse());
						continue;
					}
					const l = fo(r), c = bo(e, o, l), u = {
						kind: i,
						ownerPath: o,
						ordinal: s++,
						fragmentXml: go(r),
						signature: JSON.stringify(mo(r)),
						geometry: wo(r),
						relationshipIds: l,
						...c
					};
					t.push(u), n.push({
						level: "warning",
						code: "opaque-object-not-editable",
						partPath: o,
						message: "Unsupported " + i + " object retained in the source inventory; editable projection and preservation after mutation are not guaranteed."
					}, ...c.issues);
				}
			} catch (r) {
				n.push({
					level: "error",
					code: "opaque-scan-failed",
					partPath: o,
					message: r instanceof Error ? r.message : String(r)
				});
			}
		}
		return {
			objects: t,
			diagnostics: n
		};
	}
	var Eo = class extends Error {
		diagnostics;
		constructor(e) {
			super("DOCX export blocked: opaque object preservation could not be established (" + e.length + " diagnostics)."), this.diagnostics = e, this.name = "OpaqueObjectPreservationError";
		}
	};
	const ko = {
		decimal: "decimal",
		roman: "lowerRoman",
		ROMAN: "upperRoman",
		alphabetic: "lowerLetter",
		ALPHABETIC: "upperLetter",
		Ordinal: "ordinal"
	}, To = new Map(Object.keys(ko).map((e) => [ko[e], e]));
	function Io(e) {
		if (!e) return;
		if ("ARABIC" === e.toUpperCase()) return "decimal";
		const t = function(e) {
			if (e) {
				if ("ARABIC" === e.toUpperCase()) return "decimal";
				switch (e) {
					case "roman": return "lowerRoman";
					case "ROMAN": return "upperRoman";
					case "alphabetic": return "lowerLetter";
					case "ALPHABETIC": return "upperLetter";
					case "Ordinal": return "ordinal";
					default: return;
				}
			}
		}(e);
		return t ? To.get(t) : void 0;
	}
	function _o(e, t) {
		return At(e, t ? ko[t] : "decimal", "en-US");
	}
	const Co = (e) => /\s/u.test(e);
	function Ao(e) {
		const t = [], n = (n) => ({
			raw: e,
			command: null,
			tokens: t,
			error: n
		});
		if (e.length > 65536) return n("length-limit");
		let r = 0;
		for (; r < e.length;) {
			if (Co(e[r])) {
				r++;
				continue;
			}
			if (t.length >= 4096) return n("token-limit");
			const o = r;
			let i = "word", a = "";
			if ("\"" === e[r]) {
				i = "quoted", r++;
				let t = !1;
				for (; r < e.length;) {
					const n = e[r++];
					if ("\"" === n) {
						t = !0;
						break;
					}
					"\\" !== n || "\"" !== e[r] && "\\" !== e[r] ? a += n : a += e[r++];
				}
				if (!t) return n("unterminated-quote");
				if (r < e.length && !Co(e[r]) && "\\" !== e[r]) return n("adjacent-quote");
			} else if ("\\" === e[r]) {
				i = "switch", r++;
				const t = e[r];
				if (!t || !/[A-Za-z*@#!]/.test(t)) return n("invalid-switch");
				if (r++, a = t, r < e.length && !Co(e[r]) && "\"" !== e[r] && "\\" !== e[r]) for (; r < e.length && !Co(e[r]) && "\"" !== e[r] && "\\" !== e[r];) a += e[r++];
			} else {
				for (; r < e.length && !Co(e[r]) && "\\" !== e[r] && "\"" !== e[r];) r++;
				if ("\"" === e[r]) return n("adjacent-quote");
				a = e.slice(o, r);
			}
			t.push({
				kind: i,
				raw: e.slice(o, r),
				value: a,
				start: o,
				end: r
			});
		}
		const o = t[0];
		return o && "word" === o.kind && /^(?:[A-Za-z][A-Za-z0-9]*|=)$/.test(o.value) ? {
			raw: e,
			command: o.value.toUpperCase(),
			tokens: t
		} : n("missing-command");
	}
	function Ro(e) {
		const t = Ao(e);
		if (t.error) return;
		const n = t.tokens.slice(1), r = t.command;
		if ("PAGE" === r || "NUMPAGES" === r) {
			if (!n.length) return { type: r };
			if (2 !== n.length || "switch" !== n[0].kind || "*" !== n[0].value || "word" !== n[1].kind) return;
			const e = Io(n[1].value);
			return e ? {
				type: r,
				format: e
			} : void 0;
		}
		if ("DATE" === r) {
			if (!n.length) return { type: r };
			if (2 !== n.length || "switch" !== n[0].kind || "@" !== n[0].value || "quoted" !== n[1].kind) return;
			const e = n[1].value;
			if (!e || /["\\]/.test(e)) return;
			return {
				type: r,
				dateFormat: e
			};
		}
		if ("REF" === r || "PAGEREF" === r) {
			const e = n[0];
			if (!e || "switch" === e.kind || !e.value || /["\\]/.test(e.value)) return;
			if (1 !== n.length && (2 !== n.length || "switch" !== n[1].kind || "h" !== n[1].value.toLowerCase())) return;
			return {
				type: r,
				bookmark: e.value
			};
		}
	}
	const $o = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Do = /* @__PURE__ */ new Set([
		"name",
		"enabled",
		"calcOnExit",
		"textInput",
		"checkBox",
		"ddList",
		"helpText",
		"statusText",
		"entryMacro",
		"exitMacro"
	]);
	function Po(e, t) {
		const n = [];
		for (let r = 0; r < e.childNodes.length; r++) {
			const o = e.childNodes.item(r);
			1 === o?.nodeType && o.localName === t && o.namespaceURI === $o && n.push(o);
		}
		return n;
	}
	function Mo(e, t) {
		return Po(e, t)[0];
	}
	function Fo(e, t) {
		return e.getAttributeNS($o, t) || e.getAttribute(`w:${t}`) || void 0;
	}
	function Oo(e, t) {
		if (!e) return t;
		const n = Fo(e, "val");
		return void 0 === n ? t : ![
			"0",
			"false",
			"off",
			"no"
		].includes(n.toLowerCase()) && (!![
			"1",
			"true",
			"on",
			"yes"
		].includes(n.toLowerCase()) || t);
	}
	const Lo = (e, t) => null == e ? void 0 : e.length <= t && ![...e].some((e) => e.charCodeAt(0) < 32 || 127 === e.charCodeAt(0)) ? e : void 0;
	function Bo(e) {
		for (let f = 0; f < e.childNodes.length; f++) {
			const t = e.childNodes.item(f);
			if (1 === t?.nodeType && (!Do.has(t.localName ?? "") || t.namespaceURI !== $o)) return;
		}
		const t = Mo(e, "name"), n = Lo(t ? Fo(t, "val") : void 0, 64);
		if (!n || !/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(n)) return;
		const r = Mo(e, "textInput"), o = Mo(e, "checkBox"), i = Mo(e, "ddList");
		if (1 !== [
			r,
			o,
			i
		].filter(Boolean).length) return;
		const a = {
			name: n,
			control: r ? "text" : o ? "checkBox" : "dropDown",
			value: "",
			enabled: Oo(Mo(e, "enabled"), !0),
			calcOnExit: Oo(Mo(e, "calcOnExit"), !1)
		};
		if (r) {
			const e = Mo(r, "maxLength"), t = Fo(r, "maxLength") ?? (e ? Fo(e, "val") : void 0), n = void 0 === t ? void 0 : Number(t);
			if (void 0 !== n && (!Number.isSafeInteger(n) || n < 0 || n > 32767)) return;
			const o = Mo(r, "default"), i = Lo(o ? Fo(o, "val") : void 0, 255);
			a.textInput = {
				...void 0 !== i ? { default: i } : {},
				...void 0 !== Lo(Fo(r, "format"), 32) ? { format: Fo(r, "format") } : {},
				...void 0 !== n ? { maxLength: n } : {},
				...void 0 !== Lo(Fo(r, "type"), 32) ? { type: Fo(r, "type") } : {}
			}, a.value = i ?? "";
		} else if (o) {
			const e = Oo(Mo(o, "checked"), !1), t = Oo(Mo(o, "default"), !1), n = Mo(o, "size"), r = n ? Fo(n, "val") : void 0, i = void 0 === r ? void 0 : Number(r);
			if (void 0 !== i && (!Number.isSafeInteger(i) || i < 2 || i > 3168)) return;
			a.checkBox = {
				checked: e,
				default: t,
				...void 0 !== i ? { size: i } : {},
				...Mo(o, "sizeAuto") ? { sizeAuto: !0 } : {}
			}, a.value = e ? "x" : "";
		} else {
			const e = Po(i, "listEntry").map((e) => Lo(Fo(e, "val"), 255));
			if (e.some((e) => void 0 === e) || e.length > 25) return;
			const t = Mo(i, "defaultResult"), n = Lo(Fo(i, "defaultResult") ?? (t ? Fo(t, "val") : void 0), 255);
			a.ddList = {
				...void 0 !== n ? { defaultResult: n } : {},
				listEntries: e
			}, a.value = n ?? "";
		}
		const s = Mo(e, "helpText"), l = Mo(e, "statusText"), c = Lo(s ? Fo(s, "val") : void 0, 255), u = Lo(l ? Fo(l, "val") : void 0, 138), d = Lo(Mo(e, "entryMacro")?.textContent ?? void 0, 32), p = Lo(Mo(e, "exitMacro")?.textContent ?? void 0, 32);
		return void 0 !== c && (a.helpText = c), void 0 !== u && (a.statusText = u), void 0 !== d && (a.entryMacro = d), void 0 !== p && (a.exitMacro = p), a;
	}
	const Uo = (e, t) => t ? `<w:${e} w:val="true"/>` : `<w:${e} w:val="false"/>`, zo = (e, t) => `<w:${e} w:val="${Zn(t)}"/>`;
	const Ho = new b.XMLSerializer();
	function jo(e, t) {
		const n = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const o = e.childNodes[r];
			o?.nodeType !== o.ELEMENT_NODE || "http://schemas.openxmlformats.org/officeDocument/2006/math" !== o.namespaceURI || t && o.localName !== t || n.push(o);
		}
		return n;
	}
	function qo(e, t) {
		return jo(e, t)[0];
	}
	function Wo(e, t) {
		return e?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/math", t) ?? e?.getAttribute(`m:${t}`) ?? e?.getAttribute(t) ?? void 0;
	}
	function Go(e) {
		return e ? jo(e).map(Vo) : [];
	}
	function Vo(e) {
		switch (e.localName) {
			case "r": return function(e) {
				const t = qo(e, "t")?.textContent ?? "", n = qo(e, "rPr"), r = n ? {
					...qo(n, "sty") ? { script: Wo(qo(n, "sty"), "val") } : {},
					...qo(n, "nor") ? { normalText: !0 } : {},
					...qo(n, "b") ? { bold: "0" !== Wo(qo(n, "b"), "val") } : {},
					...qo(n, "i") ? { italic: "0" !== Wo(qo(n, "i"), "val") } : {}
				} : void 0;
				return {
					kind: "text",
					value: t,
					...r && Object.keys(r).length > 0 ? { style: r } : {}
				};
			}(e);
			case "f": return {
				kind: "fraction",
				numerator: Go(qo(e, "num")),
				denominator: Go(qo(e, "den"))
			};
			case "rad": return {
				kind: "radical",
				radicand: Go(qo(e, "e")),
				...qo(e, "deg") ? { degree: Go(qo(e, "deg")) } : {}
			};
			case "sSub":
			case "sSup":
			case "sSubSup": return function(e, t) {
				const n = Go(qo(e, "e")), r = Go(qo(e, "sub")), o = Go(qo(e, "sup"));
				return {
					kind: t,
					base: n,
					...r.length > 0 ? { subscript: r } : {},
					...o.length > 0 ? { superscript: o } : {}
				};
			}(e, "script");
			case "d": {
				const t = qo(e, "dPr");
				return {
					kind: "delimiter",
					children: jo(e, "e").map(Go),
					...Wo(qo(t, "begChr"), "val") ? { begin: Wo(qo(t, "begChr"), "val") } : {},
					...Wo(qo(t, "endChr"), "val") ? { end: Wo(qo(t, "endChr"), "val") } : {},
					...Wo(qo(t, "sepChr"), "val") ? { separator: Wo(qo(t, "sepChr"), "val") } : {},
					grow: "0" !== Wo(qo(t, "grow"), "val")
				};
			}
			case "acc": return {
				kind: "accent",
				accent: Wo(qo(qo(e, "accPr"), "chr"), "val") ?? "¯",
				children: Go(qo(e, "e"))
			};
			case "nary": {
				const t = qo(e, "naryPr");
				return {
					kind: "nary",
					operator: Wo(qo(t, "chr"), "val") ?? "∑",
					children: Go(qo(e, "e")),
					...jo(e, "sub").length > 0 ? { subscript: Go(qo(e, "sub")) } : {},
					...jo(e, "sup").length > 0 ? { superscript: Go(qo(e, "sup")) } : {},
					grow: "0" !== Wo(qo(t, "grow"), "val")
				};
			}
			case "limLow": return {
				kind: "limit",
				operator: "low",
				base: Go(qo(e, "e")),
				limit: Go(qo(e, "lim"))
			};
			case "limUpp": return {
				kind: "limit",
				operator: "upper",
				base: Go(qo(e, "e")),
				limit: Go(qo(e, "lim"))
			};
			case "m": return {
				kind: "matrix",
				rows: jo(e, "mr").map((e) => jo(e, "e").map(Go))
			};
			case "box":
			case "borderBox": return {
				kind: "box",
				children: Go(qo(e, "e")),
				border: !0
			};
			case "phant": return {
				kind: "box",
				children: Go(qo(e, "e")),
				hidden: !0
			};
			case "groupChr": return {
				kind: "accent",
				accent: Wo(qo(qo(e, "groupChrPr"), "chr"), "val") ?? "¯",
				children: Go(qo(e, "e"))
			};
			case "func": return {
				kind: "group",
				children: [...Go(qo(e, "fName")), ...Go(qo(e, "e"))]
			};
			default: return {
				kind: "raw",
				xml: Ho.serializeToString(e),
				fallbackText: e.textContent ?? ""
			};
		}
	}
	function Xo(e) {
		const t = "oMathPara" === e.localName ? qo(e, "oMath") : e;
		return {
			version: 1,
			children: t ? jo(t).map(Vo) : [],
			display: "oMathPara" === e.localName,
			sourceXml: Ho.serializeToString(e)
		};
	}
	const Zo = /* @__PURE__ */ new Set([
		"alias",
		"tag",
		"id",
		"lock",
		"placeholder",
		"dataBinding",
		"temporary",
		"appearance",
		"showingPlcHdr",
		"color",
		"text",
		"richText",
		"picture",
		"comboBox",
		"dropDownList",
		"date",
		"repeatingSection",
		"repeatingSectionItem",
		"group",
		"equation",
		"citation",
		"bibliography"
	]), Yo = /* @__PURE__ */ new Set(["repeatingSection", "repeatingSectionItem"]);
	function Qo(e) {
		if (!e) return {};
		const t = {}, n = Jt(e, Wt, "alias");
		if (n) {
			const e = nn(n, "val");
			null !== e && (t.alias = e);
		}
		const r = Jt(e, Wt, "tag");
		if (r) {
			const e = nn(r, "val");
			null !== e && (t.tag = e);
		}
		const o = Jt(e, Wt, "id");
		if (o) {
			const e = nn(o, "val");
			null !== e && (t.id = e);
		}
		const i = Jt(e, Wt, "lock");
		if (i) {
			const e = nn(i, "val");
			null !== e && (t.lock = e);
		}
		const a = Jt(e, Wt, "appearance");
		if (a) {
			const e = nn(a, "val");
			null !== e && (t.appearance = e);
		}
		const s = Jt(e, Wt, "showingPlcHdr");
		s && (t.showingPlcHdr = an(nn(s, "val")));
		const l = Jt(e, Wt, "temporary");
		l && (t.temporary = an(nn(l, "val")));
		const c = Jt(e, Wt, "color");
		if (c) {
			const e = nn(c, "val");
			null !== e && (t.color = e);
		}
		const u = Jt(e, Wt, "placeholder");
		if (u) {
			const e = Jt(u, Wt, "docPart");
			if (e) {
				const n = nn(e, "val");
				null !== n && (t.placeholderDocPart = n);
			}
		}
		const d = Jt(e, Wt, "dataBinding");
		if (d) {
			const e = function(e) {
				const t = {}, n = nn(e, "prefixMappings"), r = nn(e, "xpath"), o = nn(e, "storeItemID");
				null !== n && (t.prefixMappings = n);
				null !== r && (t.xpath = r);
				null !== o && (t.storeItemID = o);
				if (void 0 === t.prefixMappings) {
					const n = nn(Jt(e, Wt, "prefixMappings"), "val");
					null !== n && (t.prefixMappings = n);
				}
				if (void 0 === t.xpath) {
					const n = nn(Jt(e, Wt, "xpath"), "val");
					null !== n && (t.xpath = n);
				}
				if (void 0 === t.storeItemID) {
					const n = nn(Jt(e, Wt, "storeItemID"), "val");
					null !== n && (t.storeItemID = n);
				}
				return void 0 === t.prefixMappings && void 0 === t.xpath && void 0 === t.storeItemID ? null : t;
			}(d);
			e && (t.dataBinding = e);
		}
		const p = function(e) {
			const t = Jt(e, Wt, "comboBox");
			if (t) {
				const e = Jt(t, Wt, "lastSelectedValue");
				return {
					kind: "comboBox",
					listItems: Ko(t),
					...e ? { lastSelectedValue: nn(e, "val") ?? void 0 } : {}
				};
			}
			const n = Jt(e, Wt, "dropDownList");
			if (n) {
				const e = Jt(n, Wt, "lastSelectedValue");
				return {
					kind: "dropDownList",
					listItems: Ko(n),
					...e ? { lastSelectedValue: nn(e, "val") ?? void 0 } : {}
				};
			}
			const r = Jt(e, Wt, "date");
			if (r) {
				const e = nn(r, "fullDate") ?? void 0, t = Jt(r, Wt, "dateFormat"), n = Jt(r, Wt, "lid"), o = Jt(r, Wt, "calendar"), i = Jt(r, Wt, "storeMappedDataAs");
				return {
					kind: "date",
					fullDate: e,
					dateFormat: t ? nn(t, "val") ?? void 0 : void 0,
					lid: n ? nn(n, "val") ?? void 0 : void 0,
					calendar: o ? nn(o, "val") ?? void 0 : void 0,
					storeMappedDataAs: i ? nn(i, "val") ?? void 0 : void 0
				};
			}
			if (Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "text")) return { kind: "text" };
			for (const i of [
				"richText",
				"picture",
				"group",
				"equation",
				"citation",
				"bibliography"
			]) if (Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", i)) return { kind: i };
			if (tn(e, "repeatingSection") || Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection")) return { kind: "repeatingSection" };
			if (tn(e, "repeatingSectionItem") || Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSectionItem")) return { kind: "repeatingSectionItem" };
			const o = en(e, "checkbox");
			if (o) {
				const e = Jt(o, Vt, "checked"), t = Jt(o, Vt, "checkedState"), n = Jt(o, Vt, "uncheckedState"), r = e ? an(nn(e, "val")) : void 0;
				return {
					kind: "checkbox",
					...void 0 !== r ? { checked: r } : {},
					...t ? {
						checkedStateFont: nn(t, "font") ?? void 0,
						checkedStateChar: nn(t, "char") ?? void 0
					} : {},
					...n ? {
						uncheckedStateFont: nn(n, "font") ?? void 0,
						uncheckedStateChar: nn(n, "char") ?? void 0
					} : {}
				};
			}
		}(e);
		if (p && (t.subtype = p, "repeatingSection" === p.kind)) {
			const n = tn(e, "repeatingSection") ?? Jt(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection");
			if (n) {
				const e = tn(n, "sectionTitle"), r = tn(n, "doNotAllowInsertDeleteSection"), o = {}, i = nn(e, "val");
				if (null !== i && (o.sectionTitle = i), r) {
					const e = nn(r, "val");
					o.doNotAllowInsertDeleteSection = null === e || an(e);
				}
				Object.keys(o).length > 0 && (t.repeatingSectionProperties = o);
			}
		}
		const f = function(e) {
			let t = "";
			for (let n = 0; n < e.childNodes.length; n += 1) {
				const r = e.childNodes[n];
				if (r?.nodeType !== r.ELEMENT_NODE) continue;
				const o = r, i = o.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && Zo.has(o.localName), a = o.localName && "http://schemas.microsoft.com/office/word/2012/wordml" === o.namespaceURI && Yo.has(o.localName);
				i || a || (t += new b.XMLSerializer().serializeToString(o));
			}
			return t;
		}(e);
		return f.length > 0 && (t.unknownXml = f), t;
	}
	function Ko(e) {
		const t = Yt(e, Wt, "listItem");
		if (0 !== t.length) return t.map((e) => ({
			displayText: nn(e, "displayText") ?? void 0,
			value: nn(e, "value") ?? void 0
		}));
	}
	const Jo = new Set(Object.keys({
		solid: [],
		dot: [.75, 2.25],
		sysDot: [.75, .75],
		dash: [3.75, 2.25],
		sysDash: [2.25, 2.25],
		dashDot: [
			3.75,
			2.25,
			.75,
			2.25
		],
		lgDash: [6, 2.25],
		lgDashDot: [
			6,
			2.25,
			.75,
			2.25
		],
		lgDashDotDot: [
			6,
			2.25,
			.75,
			2.25,
			.75,
			2.25
		]
	}));
	function ei(e) {
		return e && Jo.has(e) ? e : void 0;
	}
	function ti(e) {
		const t = ni(e);
		return void 0 === t ? void 0 : Math.round(t / ne);
	}
	function ni(e) {
		if (null == e || "" === e) return;
		const t = parseInt(e, 10);
		return Number.isFinite(t) ? t : void 0;
	}
	function ri(e) {
		const t = e?.trim();
		if (!t) return null;
		const n = t.match(/^(-?\d+(?:\.\d+)?)(pt|px|in|cm|mm|pc)?$/i);
		if (!n) return null;
		const r = Number(n[1]);
		if (!Number.isFinite(r) || r <= 0) return null;
		switch ((n[2] ?? "px").toLowerCase()) {
			case "pt": return Math.round(r * te);
			case "in": return Math.round(96 * r);
			case "cm": return Math.round(r / 2.54 * 96);
			case "mm": return Math.round(r / 25.4 * 96);
			case "pc": return Math.round(12 * r * te);
			default: return Math.round(r);
		}
	}
	function oi(e) {
		const t = jn(e);
		return t ? `#${t}` : void 0;
	}
	function ii(e) {
		for (let t = 0; t < e.childNodes.length; t += 1) {
			const n = e.childNodes[t];
			if (n?.nodeType !== n.ELEMENT_NODE) continue;
			const r = n;
			if ("inline" === r.localName || "anchor" === r.localName) return {
				element: r,
				kind: r.localName
			};
		}
	}
	function ai(e) {
		return "1" === e || "true" === e || "0" !== e && "false" !== e && void 0;
	}
	function si(e, t) {
		const n = rn(e, t);
		if (!n) return;
		const r = rn(n, "align")?.textContent?.trim(), o = rn(n, "posOffset")?.textContent?.trim(), i = ni(o), a = {
			relativeFrom: n.getAttribute("relativeFrom") ?? void 0,
			...r ? { align: r } : {},
			...void 0 !== i ? { offset: i } : {}
		};
		return void 0 !== a.relativeFrom || void 0 !== a.align || void 0 !== a.offset ? a : void 0;
	}
	function li(e) {
		const t = si(e, "positionH"), n = si(e, "positionV"), r = function(e) {
			return rn(e, "wrapSquare") ? "square" : rn(e, "wrapTight") ? "tight" : rn(e, "wrapThrough") ? "through" : rn(e, "wrapTopAndBottom") ? "topAndBottom" : rn(e, "wrapNone") ? "none" : void 0;
		}(e), o = function(e) {
			const t = rn(e, "wrapSquare") ?? rn(e, "wrapTight") ?? rn(e, "wrapThrough");
			if (!t) return;
			const n = t.getAttribute("wrapText");
			return !n || "bothSides" === n || "left" !== n && "right" !== n && "largest" !== n && "bothSides" !== n ? void 0 : n;
		}(e), i = ni(e.getAttribute("distT")), a = ni(e.getAttribute("distB")), s = ni(e.getAttribute("distL")), l = ni(e.getAttribute("distR")), c = ai(e.getAttribute("simplePos")), u = ni(e.getAttribute("relativeHeight")), d = ai(e.getAttribute("behindDoc")), p = ai(e.getAttribute("locked")), f = ai(e.getAttribute("layoutInCell")), h = ai(e.getAttribute("allowOverlap"));
		return {
			type: "floating",
			...void 0 !== i ? { distT: i } : {},
			...void 0 !== a ? { distB: a } : {},
			...void 0 !== s ? { distL: s } : {},
			...void 0 !== l ? { distR: l } : {},
			...void 0 !== c ? { simplePos: c } : {},
			...void 0 !== u ? { relativeHeight: u } : {},
			...void 0 !== d ? { behindDoc: d } : {},
			...void 0 !== p ? { locked: p } : {},
			...void 0 !== f ? { layoutInCell: f } : {},
			...void 0 !== h ? { allowOverlap: h } : {},
			...t ? { positionH: t } : {},
			...n ? { positionV: n } : {},
			...r ? { wrap: r } : {},
			...o ? { wrapText: o } : {}
		};
	}
	async function ci(e, t, n, r) {
		const o = rn(e, "blip");
		if (!o) return {
			text: "",
			image: void 0
		};
		const { embed: i, link: a } = function(e) {
			const t = {};
			for (let n = 0; n < e.attributes.length; n += 1) {
				const r = e.attributes[n];
				r && ("embed" === r.localName || "r:embed" === r.name ? t.embed = r.value : "link" !== r.localName && "r:link" !== r.name || (t.link = r.value));
			}
			return t;
		}(o), s = ii(e), l = s?.element ?? e, c = rn(l, "extent"), u = rn(l, "docPr");
		let d = 300, p = 300;
		if (c) {
			const e = c.getAttribute("cx"), t = c.getAttribute("cy");
			e && (d = Math.round(parseInt(e, 10) / ne)), t && (p = Math.round(parseInt(t, 10) / ne));
		}
		const f = u ? nn(u, "descr") ?? nn(u, "title") : null, h = function(e) {
			const t = rn(e, "srcRect");
			if (!t) return;
			const n = (e) => {
				const n = t.getAttribute(e);
				if (null === n || "" === n) return;
				const r = parseInt(n, 10);
				return Number.isFinite(r) && 0 !== r ? r / ie : void 0;
			}, r = {
				left: n("l"),
				top: n("t"),
				right: n("r"),
				bottom: n("b")
			};
			return void 0 !== r.left || void 0 !== r.top || void 0 !== r.right || void 0 !== r.bottom ? r : void 0;
		}(e), m = function(e) {
			const t = rn(e, "pic"), n = t && rn(t, "spPr");
			if (!n) return;
			let r = null;
			for (let l = 0; l < n.childNodes.length; l += 1) {
				const e = n.childNodes[l];
				if (1 !== e?.nodeType) continue;
				const t = e;
				if ("prstGeom" === t.localName) {
					r = t;
					break;
				}
			}
			const o = r?.getAttribute("prst");
			if (!r || !o || "rect" === o) return;
			const i = {}, a = Array.from(r.childNodes).find((e) => 1 === e?.nodeType && "avLst" === e.localName);
			if (a) for (let l = 0; l < a.childNodes.length; l += 1) {
				const e = a.childNodes[l];
				if (1 !== e?.nodeType || "gd" !== e.localName) continue;
				const t = e, n = t.getAttribute("name"), r = (t.getAttribute("fmla") ?? "").match(/(-?\d+(?:\.\d+)?)\s*$/);
				n && r && (i[n] = Number(r[1]));
			}
			const s = {
				preset: o,
				rawXml: new b.XMLSerializer().serializeToString(r)
			};
			return Object.keys(i).length > 0 && (s.adjustments = i), s;
		}(e), g = function(e) {
			if (rn(e, "tile")) return "tile";
		}(e), w = function(e) {
			const t = rn(e, "pic"), n = t && rn(t, "spPr");
			if (n) for (let r = 0; r < n.childNodes.length; r += 1) {
				const e = n.childNodes[r];
				if (1 !== e?.nodeType) continue;
				const t = e;
				if ("ln" !== t.localName) continue;
				const o = oi(rn(t, "srgbClr")?.getAttribute("val"));
				if (!o) return;
				const i = { color: o }, a = ni(t.getAttribute("w"));
				void 0 !== a && (i.widthPt = In(a / re, 2));
				const s = ei(rn(t, "prstDash")?.getAttribute("val"));
				return s && (i.dash = s), i;
			}
		}(e), v = function(e) {
			const t = rn(e, "alphaModFix");
			if (!t) return;
			const n = t.getAttribute("amt");
			if (null === n || "" === n) return;
			const r = parseInt(n, 10);
			return Number.isFinite(r) ? Math.round(1e3 * (1 - Math.max(0, Math.min(ie, r)) / ie)) / 1e3 : void 0;
		}(e), y = function(e) {
			const t = rn(e, "xfrm");
			if (!t) return {};
			const n = {}, r = t.getAttribute("rot");
			if (r) {
				const e = parseInt(r, 10);
				Number.isFinite(e) && 0 !== e && (n.rotation = e / ae);
			}
			const o = t.getAttribute("flipH");
			"1" !== o && "true" !== o || (n.flipH = !0);
			const i = t.getAttribute("flipV");
			return "1" !== i && "true" !== i || (n.flipV = !0), n;
		}(e), x = "anchor" === s?.kind ? li(s.element) : void 0, S = "anchor" === s?.kind ? function(e) {
			const t = rn(e, "wrapPolygon");
			if (!t) return;
			const n = [];
			for (let r = 0; r < t.childNodes.length; r += 1) {
				const e = t.childNodes[r];
				if (1 !== e?.nodeType) continue;
				const o = e;
				if ("start" !== o.localName && "lineTo" !== o.localName) continue;
				const i = ni(o.getAttribute("x")), a = ni(o.getAttribute("y"));
				void 0 !== i && void 0 !== a && n.push({
					x: i / 21600,
					y: a / 21600
				});
			}
			if (n.length >= 2) {
				const e = n[0], t = n[n.length - 1];
				Math.abs(e.x - t.x) < 1e-6 && Math.abs(e.y - t.y) < 1e-6 && n.pop();
			}
			return n.length >= 3 ? n : void 0;
		}(s.element) : void 0, N = {
			width: d,
			height: p,
			...null !== f ? { alt: f } : {},
			...h ? { crop: h } : {},
			...m ? {
				cropShape: m,
				cropFit: "fill"
			} : {},
			...g ? { fillMode: g } : {},
			...w ? { border: w } : {},
			...void 0 !== v ? { transparency: v } : {},
			...void 0 !== y.rotation ? { rotation: y.rotation } : {},
			...y.flipH ? { flipH: !0 } : {},
			...y.flipV ? { flipV: !0 } : {},
			...x ? { floating: x } : {},
			...S ? { wrapPolygon: S } : {}
		}, E = i ? n.get(i) : void 0, k = a ? n.get(a) : void 0;
		if (k && function(e) {
			return /^[a-z][a-z0-9+.-]*:\/\//i.test(e) || e.startsWith("//");
		}(k)) return {
			text: "￼",
			image: {
				src: "",
				linkedSrc: k,
				...N
			}
		};
		const T = E ?? k;
		if (T) {
			const e = await fn(t, r, T);
			if (e) return {
				text: "￼",
				image: {
					src: e,
					...N
				}
			};
		}
		return {
			text: "",
			image: void 0
		};
	}
	function ui(e) {
		const t = e?.trim();
		if (!t) return;
		if (t.endsWith("%")) {
			const e = Number(t.slice(0, -1));
			return Number.isFinite(e) && 0 !== e ? e / 100 : void 0;
		}
		if (/f$/i.test(t)) {
			const e = Number(t.slice(0, -1));
			return Number.isFinite(e) && 0 !== e ? e / 65536 : void 0;
		}
		const n = Number(t);
		return Number.isFinite(n) && 0 !== n ? n / 65536 : void 0;
	}
	async function di(e, t, n, r) {
		const o = rn(e, "imagedata");
		if (!o) return;
		const i = function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const n = e.attributes[t];
				if (n && ("id" === n.localName || "r:id" === n.name)) return n.value;
			}
		}(o), a = i ? n.get(i) : void 0;
		if (!a) return;
		const s = function(e) {
			const t = {};
			if (!e) return t;
			for (const n of e.split(";")) {
				const e = n.indexOf(":");
				if (e < 0) continue;
				const r = n.slice(0, e).trim().toLowerCase(), o = n.slice(e + 1).trim();
				if ("width" === r) {
					const e = ri(o);
					null !== e && (t.width = e);
				} else if ("height" === r) {
					const e = ri(o);
					null !== e && (t.height = e);
				}
			}
			return t;
		}(rn(e, "shape")?.getAttribute("style")), l = function(e) {
			const t = {
				left: ui(nn(e, "cropleft")),
				top: ui(nn(e, "croptop")),
				right: ui(nn(e, "cropright")),
				bottom: ui(nn(e, "cropbottom"))
			};
			if (void 0 !== t.left || void 0 !== t.top || void 0 !== t.right || void 0 !== t.bottom) return t;
		}(o), c = nn(o, "title") ?? o.getAttribute("o:title"), u = await fn(t, r, a);
		return u ? {
			src: u,
			width: s.width ?? 300,
			height: s.height ?? 300,
			...c ? { alt: c } : {},
			...l ? { crop: l } : {}
		} : void 0;
	}
	async function pi(e, t) {
		const n = rn(e, "wsp");
		if (!n) return;
		const r = ii(e), o = r?.element ?? e, i = rn(o, "extent"), a = ti(i?.getAttribute("cx")) ?? 300, s = ti(i?.getAttribute("cy")) ?? 300, l = rn(o, "docPr"), c = l ? nn(l, "name") : null, u = l ? nn(l, "descr") ?? nn(l, "title") : null, d = "anchor" === r?.kind ? li(r.element) : void 0, p = rn(n, "txbxContent"), f = p && t ? await t(p) : [], h = function(e) {
			const t = rn(e, "spPr");
			if (!t) return;
			const n = {}, r = rn(t, "prstGeom")?.getAttribute("prst");
			r && (n.preset = r);
			for (let o = 0; o < t.childNodes.length; o += 1) {
				const e = t.childNodes[o];
				if (e?.nodeType !== e.ELEMENT_NODE) continue;
				const r = e;
				if ("solidFill" === r.localName) {
					const e = oi(rn(r, "srgbClr")?.getAttribute("val"));
					e && (n.fill = e);
				} else if ("ln" === r.localName) {
					const e = ni(r.getAttribute("w"));
					void 0 !== e && (n.borderWidthPt = In(e / re, 2));
					const t = oi(rn(r, "srgbClr")?.getAttribute("val"));
					t && (n.borderColor = t);
				}
			}
			return Object.keys(n).length > 0 ? n : void 0;
		}(n), m = function(e) {
			const t = rn(e, "bodyPr");
			if (!t) return;
			const n = {}, r = ti(t.getAttribute("lIns")), o = ti(t.getAttribute("tIns")), i = ti(t.getAttribute("rIns")), a = ti(t.getAttribute("bIns"));
			void 0 !== r && (n.paddingLeft = r), void 0 !== o && (n.paddingTop = o), void 0 !== i && (n.paddingRight = i), void 0 !== a && (n.paddingBottom = a);
			const s = t.getAttribute("anchor");
			s && (n.anchor = s);
			const l = t.getAttribute("wrap");
			l && (n.wrap = l);
			const c = t.getAttribute("vert");
			return "vert" !== c && "vert270" !== c && "wordArtVert" !== c || (n.vert = c), rn(t, "spAutoFit") && (n.autoFit = !0), Object.keys(n).length > 0 ? n : void 0;
		}(n), g = function(e) {
			const t = rn(e, "spPr");
			if (!t) return;
			const r = ni(rn(t, "xfrm")?.getAttribute("rot"));
			return void 0 !== r && 0 !== r && (Math.round(r / 6e4) % 360 + 360) % 360 || void 0;
		}(n);
		return {
			width: a,
			height: s,
			blocks: f,
			...d ? { floating: d } : {},
			...void 0 !== g ? { rotation: g } : {},
			...c ? { name: c } : {},
			...u ? { alt: u } : {},
			...h ? { shape: h } : {},
			...m ? { body: m } : {}
		};
	}
	function fi(e) {
		let t;
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			if (r?.nodeType !== r.ELEMENT_NODE) continue;
			const o = r;
			if ("Choice" !== o.localName) continue;
			const i = rn(o, "drawing");
			if (!i) continue;
			void 0 === t && (t = i);
			const a = o.getAttribute("Requires") ?? "";
			if (/\bwps\b/.test(a)) return i;
		}
		return t;
	}
	function hi(e) {
		const t = nn(e, "id");
		if (!t) return;
		if ("bookmarkEnd" === e.localName) return {
			kind: "end",
			docxId: t
		};
		const n = nn(e, "name") ?? void 0, r = nn(e, "colFirst"), o = nn(e, "colLast"), i = null !== r ? Number.parseInt(r, 10) : void 0, a = null !== o ? Number.parseInt(o, 10) : void 0;
		return {
			kind: "start",
			docxId: t,
			...void 0 !== n ? { name: n } : {},
			...void 0 === i || Number.isNaN(i) ? {} : { colFirst: i },
			...void 0 === a || Number.isNaN(a) ? {} : { colLast: a }
		};
	}
	function mi(e) {
		const t = nn(e, "id");
		if (t) return {
			kind: "commentRangeEnd" === e.localName ? "end" : "start",
			docxId: t
		};
	}
	function gi(e) {
		const t = new b.XMLSerializer().serializeToString(e);
		let n = 2166136261;
		for (let r = 0; r < t.length; r += 1) n ^= t.charCodeAt(r), n = Math.imul(n, 16777619);
		return `revision:${n >>> 0}`;
	}
	function wi(e) {
		const t = e.localName;
		if ("ins" !== t && "del" !== t && "moveFrom" !== t && "moveTo" !== t) return;
		const n = nn(e, "date"), r = n ? Date.parse(n) : NaN, o = "del" === t || "moveFrom" === t;
		return {
			id: nn(e, "id") ?? gi(e),
			type: o ? "delete" : "insert",
			author: nn(e, "author") ?? "Unknown",
			date: Number.isFinite(r) ? r : 0,
			..."moveFrom" === t ? { move: "from" } : "moveTo" === t ? { move: "to" } : {}
		};
	}
	function bi(e) {
		const t = /^move(From|To)Range(Start|End)$/.exec(e.localName ?? "");
		if (!t) return;
		const n = "From" === t[1] ? "from" : "to", r = "Start" === t[2] ? "start" : "end", o = nn(e, "date"), i = o ? Date.parse(o) : NaN, a = nn(e, "colFirst"), s = nn(e, "colLast"), l = null !== a ? Number.parseInt(a, 10) : NaN, c = null !== s ? Number.parseInt(s, 10) : NaN, u = nn(e, "name") ?? void 0, d = nn(e, "author") ?? void 0, p = nn(e, "displacedByCustomXml") ?? void 0;
		return {
			move: n,
			edge: r,
			id: nn(e, "id") ?? gi(e),
			...void 0 !== u ? { name: u } : {},
			...void 0 !== d ? { author: d } : {},
			...Number.isFinite(i) ? { date: i } : {},
			...Number.isFinite(l) ? { columnFirst: l } : {},
			...Number.isFinite(c) ? { columnLast: c } : {},
			...void 0 !== p ? { displacedByCustomXml: p } : {}
		};
	}
	async function vi(e, t, n, r, o, i) {
		const a = [];
		let s, l, c, u = 0;
		const d = [], p = [], f = (e) => {
			a.push(e), u += e.length;
		}, h = i ?? e.childNodes;
		for (let m = 0; m < h.length; m += 1) {
			const e = h[m];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const i = e;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === i.namespaceURI) if ("t" === i.localName || "delText" === i.localName) f(i.textContent ?? "");
			else if ("tab" === i.localName) f("	");
			else if ("noBreakHyphen" === i.localName) f("‑");
			else if ("softHyphen" === i.localName) f("­");
			else if ("br" === i.localName) {
				const e = nn(i, "type");
				f("page" === e ? "\f" : "column" === e ? "\v" : "\n");
			} else {
				if ("lastRenderedPageBreak" === i.localName) continue;
				if ("bookmarkStart" === i.localName || "bookmarkEnd" === i.localName) {
					const e = hi(i);
					e && d.push({
						offset: u,
						marker: e
					});
					continue;
				}
				if ("commentRangeStart" === i.localName || "commentRangeEnd" === i.localName) {
					const e = mi(i);
					e && p.push({
						offset: u,
						marker: e
					});
					continue;
				}
				if ("proofErr" === i.localName || "commentReference" === i.localName || "permStart" === i.localName || "permEnd" === i.localName) continue;
				if ("cr" === i.localName) f("\n");
				else if ("drawing" === i.localName) {
					const e = await ci(i, t, n, r);
					if (e.image) f(e.text), s = e.image;
					else {
						const e = await pi(i, o);
						e && (f("￼"), l = e);
					}
				} else if ("pict" === i.localName) {
					const e = await di(i, t, n, r);
					e && (f("￼"), s = e);
				} else if ("sym" === i.localName) {
					const e = nn(i, "font") ?? "", t = nn(i, "char") ?? "", n = parseInt(t, 16);
					f(Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : "?"), c = {
						font: e,
						char: t
					};
				}
			}
			else if ("AlternateContent" === i.localName) {
				const e = fi(i);
				if (e) {
					const t = await pi(e, o);
					t && (f("￼"), l = t);
				}
			}
		}
		return {
			text: a.join(""),
			image: s,
			...l ? { textBox: l } : {},
			...d.length > 0 ? { innerBookmarks: d } : {},
			...p.length > 0 ? { innerComments: p } : {},
			...c ? { sym: c } : {}
		};
	}
	async function yi(e, t, n, r, o, i, a, s) {
		const l = [], c = [], u = (e) => {
			if (e.nested) return;
			const t = Ro(e.instruction);
			if (!t) return;
			const n = function(e) {
				if ("begin" !== e[0]?.fieldChar?.kind || "end" !== e.at(-1)?.fieldChar?.kind) return;
				let t = !1, n = !1;
				const r = [];
				for (let o = 0; o < e.length; o++) {
					const i = e[o];
					if (i.fieldChar) {
						if (i.fieldChar.fieldLock || i.fieldChar.dirty) return;
						if (0 === o || o === e.length - 1) continue;
						if ("separate" !== i.fieldChar.kind || t || !n) return;
						t = !0;
					} else if (void 0 !== i.fieldInstruction) {
						if (t) return;
						n = !0;
					} else {
						if (!t) return;
						r.push(i);
					}
				}
				return n && Zr(r) ? r : void 0;
			}(l.slice(e.beginIndex));
			if (!n) return;
			const r = n.map((e) => e.text).join("") || "1", o = n.find((e) => e.styles)?.styles ?? e.beginStyles;
			l.length = e.beginIndex, l.push({
				text: r,
				...o ? { styles: o } : {},
				field: t
			});
		}, d = (e, t) => {
			const n = nn(e, "fldCharType"), r = nn(e, "fldLock"), o = nn(e, "dirty"), i = "true" === r || "1" === r || "on" === r, a = "true" === o || "1" === o || "on" === o;
			if ("begin" === n) {
				const n = c.length > 0;
				for (const e of c) e.nested = !0;
				let r;
				for (let t = 0; t < e.childNodes.length; t++) {
					const n = e.childNodes.item(t);
					1 === n?.nodeType && "ffData" === n.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && (r = Bo(n));
				}
				l.push({
					text: "",
					fieldChar: {
						kind: "begin",
						...i ? { fieldLock: !0 } : {},
						...a ? { dirty: !0 } : {},
						...r ? { formField: r } : {}
					},
					...t ? { styles: t } : {}
				}), c.push({
					beginIndex: l.length - 1,
					instruction: "",
					nested: n,
					...t ? { beginStyles: t } : {}
				});
			} else if ("separate" === n) l.push({
				text: "",
				fieldChar: {
					kind: "separate",
					...i ? { fieldLock: !0 } : {},
					...a ? { dirty: !0 } : {}
				},
				...t ? { styles: t } : {}
			});
			else if ("end" === n) {
				l.push({
					text: "",
					fieldChar: {
						kind: "end",
						...i ? { fieldLock: !0 } : {},
						...a ? { dirty: !0 } : {}
					},
					...t ? { styles: t } : {}
				});
				const e = c.pop();
				e && u(e);
			}
		}, p = (e, t) => {
			const n = e.textContent ?? "";
			l.push({
				text: "",
				fieldInstruction: n,
				...t ? { styles: t } : {}
			});
			const r = c[c.length - 1];
			r && (r.instruction += n);
		};
		for (let f = 0; f < e.childNodes.length; f += 1) {
			const u = e.childNodes[f];
			if (u?.nodeType !== u.ELEMENT_NODE) continue;
			const h = u;
			if ("http://schemas.openxmlformats.org/officeDocument/2006/math" === h.namespaceURI && ("oMath" === h.localName || "oMathPara" === h.localName)) {
				l.push({
					text: "￼",
					math: Xo(h)
				});
				continue;
			}
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== h.namespaceURI) continue;
			if ("bookmarkStart" === h.localName || "bookmarkEnd" === h.localName) {
				const e = hi(h);
				if (!e) continue;
				l.push({
					text: "",
					bookmark: e
				});
				continue;
			}
			if ("commentRangeStart" === h.localName || "commentRangeEnd" === h.localName) {
				const e = mi(h);
				if (!e) continue;
				l.push({
					text: "",
					comment: e
				});
				continue;
			}
			const m = bi(h);
			if (m) {
				l.push({
					text: "",
					revisionRangeMarker: m
				});
				continue;
			}
			const g = wi(h);
			if (g) {
				const e = await yi(h, t, n, r, o, i, a, s);
				for (const t of e) l.push({
					...t,
					revision: t.revision ?? g
				});
				continue;
			}
			if ("sdt" === h.localName) {
				const e = Jt(h, Wt, "sdtContent");
				if (!e) continue;
				const c = Jt(h, Wt, "sdtPr"), u = Jt(h, Wt, "sdtEndPr"), d = {
					groupId: V("sdt"),
					sdtPr: Qo(c),
					...u ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(u) } : {}
				}, p = await yi(e, t, n, r, o, i, a, s);
				for (const t of p) l.push({
					...t,
					sdtWrappers: [d, ...t.sdtWrappers ?? []]
				});
				continue;
			}
			if ("r" === h.localName) {
				const e = Er(Jt(h, Wt, "rPr"), i), t = Array.from(h.childNodes).filter((e) => 1 === e.nodeType && !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "rPr" === e.localName)), u = t.map((e) => ({
					child: e,
					opaque: So(e)
				})), f = (e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && [
					"t",
					"delText",
					"tab",
					"noBreakHyphen",
					"softHyphen",
					"br",
					"cr",
					"lastRenderedPageBreak"
				].includes(e.localName ?? ""), m = (e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && [
					"drawing",
					"pict",
					"sym",
					"bookmarkStart",
					"bookmarkEnd",
					"commentRangeStart",
					"commentRangeEnd"
				].includes(e.localName ?? "") || "http://schemas.openxmlformats.org/markup-compatibility/2006" === e.namespaceURI && "AlternateContent" === e.localName;
				if (u.some((e) => e.opaque) && (1 === t.length || !c.length && u.every((e) => e.opaque || f(e.child) || m(e.child)))) {
					let t = "";
					const i = a ? {
						...e,
						link: a
					} : e, c = () => {
						t.length && (l.push({
							text: t,
							...i ? { styles: { ...i } } : {}
						}), t = "");
					};
					for (const { child: e, opaque: a } of u) if (a) c(), l.push({
						text: "￼",
						opaque: a,
						...i ? { styles: { ...i } } : {}
					});
					else {
						if (m(e)) {
							c();
							const t = await vi(h, n, r, o, s, [e]);
							for (const e of t.innerBookmarks ?? []) l.push({
								text: "",
								bookmark: e.marker
							});
							for (const e of t.innerComments ?? []) l.push({
								text: "",
								comment: e.marker
							});
							if (t.text.length || t.image || t.textBox) {
								const e = t.sym && !i?.fontFamily ? {
									...i,
									fontFamily: t.sym.font
								} : i;
								l.push({
									text: t.text,
									...t.image ? { image: t.image } : {},
									...t.textBox ? { textBox: t.textBox } : {},
									...t.sym ? { sym: t.sym } : {},
									...e ? { styles: { ...e } } : {}
								});
							}
							continue;
						}
						switch (e.localName) {
							case "t":
							case "delText":
								t += e.textContent ?? "";
								break;
							case "tab":
								t += "	";
								break;
							case "noBreakHyphen":
								t += "‑";
								break;
							case "softHyphen":
								t += "­";
								break;
							case "cr":
								t += "\n";
								break;
							case "br": {
								const n = nn(e, "type");
								t += "page" === n ? "\f" : "column" === n ? "\v" : "\n";
								break;
							}
						}
					}
					c();
					continue;
				}
				if (Yt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "fldChar").length > 0 || Yt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instrText").length > 0 || Yt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "delInstrText").length > 0) {
					for (let t = 0; t < h.childNodes.length; t += 1) {
						const i = h.childNodes[t];
						if (i?.nodeType !== i.ELEMENT_NODE) continue;
						const a = i;
						if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI) {
							if ("fldChar" === a.localName) d(a, e);
							else if ("instrText" === a.localName || "delInstrText" === a.localName) p(a, e);
							else if (f(a)) {
								const t = await vi(h, n, r, o, s, [a]);
								t.text.length && l.push({
									text: t.text,
									...e ? { styles: { ...e } } : {}
								});
							}
						}
					}
					continue;
				}
				const g = Jt(h, Wt, "footnoteReference");
				if (g) {
					const t = nn(g, "id");
					if (!t) continue;
					const n = nn(g, "customMarkFollows");
					let r = e;
					(r ??= {}).styleId ??= "footnoteReference", void 0 === r.superscript && (r.superscript = !0), l.push({
						text: "?",
						styles: r,
						footnoteReference: {
							docxId: t,
							...n ? { customMark: n } : {}
						}
					});
					continue;
				}
				const w = Jt(h, Wt, "endnoteReference");
				if (w) {
					const t = nn(w, "id");
					if (!t) continue;
					const n = nn(w, "customMarkFollows");
					let r = e;
					(r ??= {}).styleId ??= "endnoteReference", void 0 === r.superscript && (r.superscript = !0), l.push({
						text: "?",
						styles: r,
						endnoteReference: {
							docxId: t,
							...n ? { customMark: n } : {}
						}
					});
					continue;
				}
				const { text: b, image: v, textBox: y, innerBookmarks: x, innerComments: S, sym: N } = await vi(h, n, r, o, s);
				let E = e;
				N && !E?.fontFamily && ((E ??= {}).fontFamily = N.font), a && ((E ??= {}).link = a);
				const k = [...(x ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						bookmark: e.marker
					}
				})), ...(S ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						comment: e.marker
					}
				}))];
				if (k.length > 0 && !v && !y) {
					k.sort((e, t) => e.offset - t.offset);
					let e = 0;
					for (const n of k) {
						const t = b.slice(e, n.offset);
						t.length > 0 && l.push({
							text: t,
							...E ? { styles: E } : {}
						}), l.push(n.run), e = n.offset;
					}
					const t = b.slice(e);
					t.length > 0 && l.push({
						text: t,
						...E ? { styles: E } : {}
					});
					continue;
				}
				if (0 === b.length && !v && !y) continue;
				if (l.push({
					text: b,
					...v ? { image: v } : {},
					...y ? { textBox: y } : {},
					...N ? { sym: N } : {},
					...E ? { styles: E } : {}
				}), x) for (const n of x) l.push({
					text: "",
					bookmark: n.marker
				});
				continue;
			}
			if ("fldSimple" === h.localName) {
				const e = h.getAttribute("w:instr") ?? h.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instr") ?? h.getAttribute("instr") ?? "", u = Ro(e), d = await yi(h, t, n, r, o, i, a, s), p = nn(h, "fldLock"), f = nn(h, "dirty"), m = "true" === p || "1" === p || "on" === p, g = "true" === f || "1" === f || "on" === f;
				if (!u || m || g || c.length || !Zr(d)) {
					for (const e of c) e.nested = !0;
					l.push({
						text: "",
						fieldChar: {
							kind: "begin",
							...m ? { fieldLock: !0 } : {},
							...g ? { dirty: !0 } : {}
						}
					}), l.push({
						text: "",
						fieldInstruction: e
					}), l.push({
						text: "",
						fieldChar: { kind: "separate" }
					}), l.push(...d), l.push({
						text: "",
						fieldChar: { kind: "end" }
					});
				} else {
					const e = d.map((e) => e.text).join("") || "1", t = d.find((e) => e.styles)?.styles;
					l.push({
						text: e,
						styles: t,
						field: u
					});
				}
				continue;
			}
			if ("hyperlink" === h.localName) {
				let e = r.get(h.getAttribute("r:id") ?? h.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "") ?? null;
				if (!e) {
					const t = nn(h, "anchor");
					t && (e = `#${t}`);
				}
				l.push(...await yi(h, t, n, r, o, i, e, s));
			}
		}
		return l;
	}
	const xi = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Si = /<w:rPr(?:\s|\/|>)/, Ni = /<w:pPr(?:\s|\/|>)/;
	function Ei(e) {
		if (Array.isArray(e)) return e.map(Ei);
		if (!e || "object" != typeof e) return e;
		const t = e, n = function(e) {
			return "string" == typeof e.kind || "string" == typeof e.type || Array.isArray(e.runs) || Array.isArray(e.rows) || Array.isArray(e.cells) || Array.isArray(e.blocks);
		}(t), r = {};
		for (const [o, i] of Object.entries(t).sort(([e], [t]) => e.localeCompare(t))) void 0 === i || "id" === o && n || "ooxmlSource" === o || o.startsWith("__") || (r[o] = Ei(i));
		return r;
	}
	function ki(e) {
		return JSON.stringify(Ei(e)) ?? "undefined";
	}
	function Ti(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Ii(e, t) {
		const n = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const o = e.childNodes[r];
			o?.nodeType === o.ELEMENT_NODE && o.namespaceURI === xi && o.localName === t && n.push(o);
		}
		return n;
	}
	function _i(e, t) {
		return Ii(e, t)[0];
	}
	function Ci(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : void 0;
	}
	function Ai(e) {
		return ki(e);
	}
	function Ri(e) {
		return ki({
			...e,
			text: void 0
		});
	}
	function $i(e, t) {
		e.ooxmlSource = {
			xml: t,
			semanticSignature: Ai(e),
			structureSignature: Ri(e)
		};
	}
	function Di(e) {
		return e.ooxmlSource;
	}
	function Pi(e) {
		return ki(e);
	}
	function Mi(e) {
		return ki({
			style: e.style,
			list: e.list,
			numberingRevision: e.numberingRevision
		});
	}
	function Fi(e) {
		return e.ooxmlSource;
	}
	function Oi(e) {
		return ki(e);
	}
	function Li(e) {
		return ki({ style: e.style });
	}
	function Bi(e) {
		return ki({
			gridCols: e.gridCols,
			gridRevision: e.gridRevision
		});
	}
	function Ui(e) {
		return ki({
			isHeader: e.isHeader,
			style: e.style,
			conditionalStyle: e.conditionalStyle
		});
	}
	function zi(e) {
		return ki({
			propertyExceptions: e.propertyExceptions,
			tblPrExChangeXml: e.tblPrExChangeXml
		});
	}
	function Hi(e) {
		return ki({
			colSpan: e.colSpan,
			rowSpan: e.rowSpan,
			vMerge: e.vMerge,
			style: e.style,
			conditionalStyle: e.conditionalStyle,
			mergeRevisionState: e.mergeRevisionState
		});
	}
	function ji(e) {
		return e.ooxmlSource;
	}
	function qi(e, t) {
		const n = Ci(_i(t, "tblPr")), r = Ci(_i(t, "tblGrid")), o = Ii(t, "tr");
		return o.length === e.rows.length && o.forEach((t, n) => {
			const r = e.rows[n];
			(function(e, t) {
				const n = {};
				t.rowPropertiesXml && (n.rowProperties = {
					xml: t.rowPropertiesXml,
					semanticSignature: Ui(e)
				}), t.propertyExceptionsXml && (n.propertyExceptions = {
					xml: t.propertyExceptionsXml,
					semanticSignature: zi(e)
				}), (n.rowProperties || n.propertyExceptions) && (e.ooxmlSource = n);
			})(r, {
				rowPropertiesXml: Ci(_i(t, "trPr")),
				propertyExceptionsXml: Ci(_i(t, "tblPrEx"))
			});
			const o = Ii(t, "tc");
			o.length === r.cells.length && o.forEach((e, t) => {
				const n = Ci(_i(e, "tcPr"));
				n && function(e, t) {
					e.ooxmlSource = { cellProperties: {
						xml: t,
						semanticSignature: Hi(e)
					} };
				}(r.cells[t], n);
			});
		}), {
			tablePropertiesXml: n,
			tableGridXml: r
		};
	}
	function Wi(e) {
		return e.ooxmlSource;
	}
	function Gi(e, t, n) {
		const r = new b.XMLSerializer(), o = function(e, t) {
			const n = t.serializeToString(e.cloneNode(!1)), r = n.indexOf(">");
			if (r < 0) return;
			const o = n.slice(0, r + 1), i = e.tagName;
			return o.slice(`<${i}`.length, o.endsWith("/>") ? -2 : -1).trim() || void 0;
		}(e, r), i = t ? Jt(t, Wt, "sectPr") : null, a = i ? void 0 : r.serializeToString(e), s = t && !i ? r.serializeToString(t) : void 0, l = function(e, t) {
			const n = [], r = (e) => {
				for (let o = 0; o < e.childNodes.length; o += 1) {
					const i = e.childNodes[o];
					if (i?.nodeType !== i.ELEMENT_NODE) continue;
					const a = i;
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "r" !== a.localName ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "pPr" !== a.localName && "p" !== a.localName && "tbl" !== a.localName && "txbxContent" !== a.localName) && r(a) : n.push(t.serializeToString(a));
				}
			};
			return r(e), n;
		}(e, r), c = n.some((e) => e.opaque) || l.length !== n.length ? void 0 : l;
		if (a || o || s || c) return {
			...a ? { xml: a } : {},
			...o ? { attributes: o } : {},
			...s ? { paragraphPropertiesXml: s } : {},
			...c ? { runXml: c } : {}
		};
	}
	function Vi(e) {
		const t = {
			id: V("run"),
			text: e.text
		};
		let n;
		e.styles && (t.styles = { ...e.styles }), e.revision && (t.revision = { ...e.revision }), e.revisionRangeMarker && (t.revisionRangeMarker = { ...e.revisionRangeMarker }), e.sdtWrappers?.length && (t.sdtWrappers = [...e.sdtWrappers]), n = e.fieldChar ? {
			...t,
			kind: "fieldChar",
			fieldChar: { ...e.fieldChar }
		} : void 0 !== e.fieldInstruction ? {
			...t,
			kind: "fieldInstruction",
			fieldInstruction: e.fieldInstruction
		} : e.field ? {
			...t,
			kind: "field",
			field: { ...e.field }
		} : e.opaque ? {
			...t,
			text: "￼",
			kind: "opaque",
			opaque: e.opaque
		} : e.textBox ? {
			...t,
			kind: "textBox",
			textBox: e.textBox
		} : e.image ? {
			...t,
			kind: "image",
			image: e.image
		} : e.sym ? {
			...t,
			kind: "sym",
			sym: { ...e.sym }
		} : e.math ? {
			...t,
			text: "￼",
			kind: "math",
			math: e.math
		} : {
			...t,
			kind: "text"
		};
		const r = n;
		return e.footnoteReference && (r.__importedFootnoteRef = { ...e.footnoteReference }), e.endnoteReference && (r.__importedEndnoteRef = { ...e.endnoteReference }), e.bookmark && (r.__importedBookmark = { ...e.bookmark }), e.comment && (r.__importedComment = { ...e.comment }), r;
	}
	function Xi(e, t, n, r, o, i) {
		const a = e.length > 0 ? e.map(Vi) : [{
			id: V("run"),
			text: "",
			kind: "text",
			...o ? { styles: { ...o } } : {}
		}], s = {
			id: V("paragraph"),
			type: "paragraph",
			runs: a
		};
		s.style = t ? { ...t } : void 0;
		for (const l of s.runs) l.styles = Nr(l.styles, s.style?.styleId);
		if (s.list = n ? { ...n } : void 0, s.numberingRevision = r ? { ...r } : void 0, i?.runXml?.length === s.runs.length) for (let l = 0; l < s.runs.length; l += 1) $i(s.runs[l], i.runXml[l]);
		return i && function(e, t) {
			const n = {};
			t.xml && (n.xml = t.xml, n.semanticSignature = Pi(e)), t.attributes && (n.attributes = t.attributes), t.paragraphPropertiesXml && (n.paragraphProperties = {
				xml: t.paragraphPropertiesXml,
				semanticSignature: Mi(e)
			}), (n.xml || n.attributes || n.paragraphProperties) && (e.ooxmlSource = n);
		}(s, i), s;
	}
	function Zi(e) {
		return e.some((e) => e.image || e.textBox || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.bookmark || e.comment || e.revisionRangeMarker || e.text.replace(/\s/g, "").length > 0);
	}
	async function Yi(e, t, n, r, o, i, a, s) {
		const l = Jt(e, Wt, "pPr"), c = await yi(e, t, n, r, o, i, void 0, a), u = zr(Hr(l, i.colors)), d = Er(Jt(l, Wt, "rPr"), i), p = dr(l, t), f = p?.list, h = function(e) {
			if (!e) return;
			const n = Jt(Jt(e, Wt, "numPr"), Wt, "numberingChange"), r = ir(n);
			if (!r) return;
			const o = nn(n, "original") ?? void 0;
			return {
				...r,
				...void 0 !== o ? { original: o } : {}
			};
		}(l);
		let m = u;
		if (p?.indent) {
			const { left: e, hanging: t } = p.indent, n = u ?? {};
			m = {
				...n,
				...void 0 === n.indentLeft && void 0 !== e ? { indentLeft: e } : {},
				...void 0 === n.indentHanging && void 0 !== t ? { indentHanging: t } : {}
			};
		}
		const g = Ur(s ? {
			...s,
			...m ?? {}
		} : m), w = function(e, t) {
			const n = Jt(e, Wt, "framePr");
			if (!n) return null;
			const r = nn(n, "dropCap");
			if (!r || "none" === r) return null;
			const o = t.map((e) => e.text).join("");
			if (0 === o.length) return null;
			const i = Number(nn(n, "lines"));
			return {
				text: o,
				lines: Number.isFinite(i) && i > 0 ? i : 3,
				type: "margin" === r ? "margin" : "drop",
				style: t[0]?.styles
			};
		}(l, c);
		if (w) return {
			paragraphs: [],
			pageBreakAfter: !1,
			dropCapFrame: w
		};
		const { segments: b, hasPageBreak: v } = function(e) {
			const t = [[]];
			let n = !1;
			const r = (e, n) => {
				(0 !== n.length || e.image || e.textBox || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.bookmark || e.comment || e.revisionRangeMarker) && t[t.length - 1].push({
					...e,
					text: n
				});
			};
			for (const o of e) {
				if (!o.text.includes("\f")) {
					r(o, o.text);
					continue;
				}
				const e = o.text.split("\f");
				e.forEach((i, a) => {
					r(o, i), a < e.length - 1 && (n = !0, t.push([]));
				});
			}
			return {
				segments: t,
				hasPageBreak: n
			};
		}(c);
		if (!v) return {
			paragraphs: [Xi(c, g, f, h, d, Gi(e, l, c))],
			pageBreakAfter: !1
		};
		const y = [];
		let x = !1;
		for (let S = 0; S < b.length; S += 1) {
			const e = b[S];
			if (S > 0 && (x = !0), !Zi(e)) continue;
			const t = x ? {
				...g ?? {},
				pageBreakBefore: !0
			} : g;
			y.push(Xi(e, t, f, h, d)), x = !1;
		}
		return {
			paragraphs: y,
			pageBreakAfter: x
		};
	}
	async function Qi(e, t, n, r, o, i, a, s) {
		return (await Yi(e, t, n, r, o, i, a, s)).paragraphs[0] ?? K([{ text: "" }]);
	}
	function Ki(e, t, n, r) {
		for (const o of qt(e)) {
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== o.namespaceURI) continue;
			if (o.localName === t) {
				r.push({
					element: o,
					...n.length > 0 ? { sdtWrappers: n } : {}
				});
				continue;
			}
			if ("sdt" !== o.localName) continue;
			const e = Jt(o, Wt, "sdtContent");
			if (!e) continue;
			const i = Jt(o, Wt, "sdtPr"), a = Jt(o, Wt, "sdtEndPr"), s = {
				groupId: V("sdt"),
				sdtPr: Qo(i),
				...a ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(a) } : {}
			};
			Ki(e, t, [...n, s], r);
		}
	}
	function Ji(e, t) {
		const n = [];
		return Ki(e, t, [], n), n;
	}
	function ea(e, t) {
		if (!t.every((e) => "paragraph" === e.type)) return;
		const n = Yt(e, Wt, "p");
		n.length === t.length && function(e, t) {
			const n = (e) => e.style ??= {}, r = e.length - 1;
			for (let o = 0; o < e.length; o += 1) {
				const i = t[o];
				i && (0 === o && i.before && (n(e[o]).spacingBefore = 0), o === r && i.after && (n(e[o]).spacingAfter = 0));
			}
			for (let o = 0; o < r; o += 1) {
				if (!t[o]?.after || !t[o + 1]?.before) continue;
				const r = n(e[o]), i = n(e[o + 1]);
				(r.spacingAfter ?? 0) >= (i.spacingBefore ?? 0) ? i.spacingBefore = 0 : r.spacingAfter = 0;
			}
		}(t, n.map((e) => function(e) {
			const t = Jt(e, Wt, "spacing");
			return {
				before: an(nn(t, "beforeAutospacing")),
				after: an(nn(t, "afterAutospacing"))
			};
		}(Jt(e, Wt, "pPr"))));
	}
	function ta(e) {
		const t = e.style?.revision, n = "merge" === t?.type ? t.previous?.vMerge : void 0;
		if (!t || "merge" !== t.type || !n) return;
		const r = e.style ? {
			...e.style,
			revision: void 0
		} : void 0, o = {
			...e,
			blocks: "continue" === n ? [] : e.blocks,
			vMerge: n,
			rowSpan: void 0,
			style: r,
			mergeRevisionState: void 0
		};
		e.mergeRevisionState = {
			revisionId: t.id,
			orientation: "vertical",
			currentCellCount: 1,
			previousCells: [o]
		};
	}
	async function na(e, t, n, r, o, i, a, s) {
		const l = [], c = Jt(e, Wt, "tblGrid");
		if (c) for (const b of Yt(c, Wt, "gridCol")) {
			const e = Cn(nn(b, "w"));
			void 0 !== e && l.push(e);
		}
		const u = Jt(c, Wt, "tblGridChange"), d = Jt(e, Wt, "tblPr"), p = nn(Jt(d, Wt, "tblStyle"), "val"), f = Dr(d, p ?? void 0), h = function(e) {
			const t = Jt(e, Wt, "tblLook"), n = (e) => {
				const n = nn(t, e);
				return null === n || "" === n ? void 0 : an(n);
			}, r = nn(t, "val"), o = r ? Number.parseInt(r, 16) : NaN, i = (e) => Number.isFinite(o) ? 0 !== (o & e) : void 0;
			return {
				firstRow: n("firstRow") ?? i(32) ?? !0,
				lastRow: n("lastRow") ?? i(64) ?? !1,
				firstCol: n("firstColumn") ?? i(128) ?? !0,
				lastCol: n("lastColumn") ?? i(256) ?? !1,
				noHBand: n("noHBand") ?? i(512) ?? !1,
				noVBand: n("noVBand") ?? i(1024) ?? !1
			};
		}(d), m = Ji(e, "tr"), g = [];
		for (let v = 0; v < m.length; v += 1) {
			const e = m[v], t = e.element, n = Jt(t, Wt, "trPr"), r = Cr(n), o = Ji(t, "tc"), s = [];
			for (let p = 0; p < o.length; p += 1) {
				const e = o[p], t = e.element, n = Jt(t, Wt, "tcPr"), r = await a(t);
				ea(t, r);
				const l = Mr(n);
				if ("continue" === Or(n) && s.length > 0) {
					const e = s[s.length - 1];
					e.colSpan = (e.colSpan ?? 1) + l;
					continue;
				}
				const c = Fr(n), u = Lr(n, void 0, i.colors), d = J(r.length > 0 ? r : [K([{ text: "" }])], l, "restart" === c ? {
					rowSpan: 1,
					vMerge: c
				} : c ? { vMerge: c } : void 0);
				u && (d.style = u), d.conditionalStyle = Cr(n), e.sdtWrappers?.length && (d.sdtWrappers = [...e.sdtWrappers]);
				const f = on(t);
				f && (d.extAttributes = f), ta(d), "continue" === c && (d.blocks = []), s.push(d);
			}
			const l = ee(s, Br(t) ? { isHeader: !0 } : void 0), c = Pr(n);
			c && (l.style = c), l.conditionalStyle = r, e.sdtWrappers?.length && (l.sdtWrappers = [...e.sdtWrappers]);
			const u = on(t);
			u && (l.extAttributes = u);
			const d = Jt(t, Wt, "tblPrEx");
			if (d) {
				const e = Dr(d);
				e && (l.propertyExceptions = e);
				const t = Jt(d, Wt, "tblPrExChange");
				if (t) {
					const e = Rr(t);
					e && (l.propertyExceptionsRevision = e), l.tblPrExChangeXml = new b.XMLSerializer().serializeToString(t);
				}
			}
			g.push(l);
		}
		for (let b = 0; b < g.length; b += 1) {
			const e = g[b];
			for (let t = 0; t < e.cells.length; t += 1) {
				const n = e.cells[t];
				if ("restart" !== n.vMerge) continue;
				let r = 1;
				for (let e = b + 1; e < g.length; e += 1) {
					const n = g[e].cells[t];
					if (!n || "continue" !== n.vMerge) break;
					r += 1;
				}
				r > 1 && (n.rowSpan = r);
			}
		}
		const w = function(e, t) {
			return {
				id: V("table"),
				type: "table",
				rows: e,
				gridCols: t
			};
		}(g, l.length > 0 ? l : void 0);
		if (f && (w.style = f), w.style ? w.style.tblLook = h : p && (w.style = { tblLook: h }), u) {
			const e = Jt(u, Wt, "tblGrid"), t = e ? Yt(e, Wt, "gridCol").map((e) => Cn(nn(e, "w"))).filter((e) => void 0 !== e) : [], n = nn(u, "date"), r = n ? Date.parse(n) : NaN;
			w.gridRevision = {
				id: nn(u, "id") ?? "revision:grid",
				author: nn(u, "author") ?? "Unknown",
				date: Number.isFinite(r) ? r : 0,
				type: "grid",
				previous: t
			};
		}
		return function(e, t) {
			let n = "string" == typeof t ? { xml: t } : t;
			if ("string" == typeof t) {
				const r = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
				r?.namespaceURI === xi && "tbl" === r.localName && (n = {
					...n,
					...qi(e, r)
				});
			}
			const r = {
				xml: n.xml,
				semanticSignature: Oi(e)
			};
			n.tablePropertiesXml && (r.tableProperties = {
				xml: n.tablePropertiesXml,
				semanticSignature: Li(e)
			}), n.tableGridXml && (r.tableGrid = {
				xml: n.tableGridXml,
				semanticSignature: Bi(e)
			}), e.ooxmlSource = r;
		}(w, new b.XMLSerializer().serializeToString(e)), w;
	}
	async function ra(e, t, n, r, o, i, a) {
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI ? [] : "p" === e.localName ? (await Yi(e, t, n, r, o, i, a)).paragraphs : "tbl" === e.localName ? [await na(e, 0, 0, 0, 0, i, a)] : "sdt" === e.localName ? oa(e, t, n, r, o, i, a) : [];
	}
	async function oa(e, t, n, r, o, i, a) {
		const s = Jt(e, Wt, "sdtPr"), l = Jt(e, Wt, "sdtEndPr"), c = {
			groupId: V("sdt"),
			sdtPr: Qo(s),
			...l ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(l) } : {}
		}, u = Jt(e, Wt, "sdtContent"), d = [];
		if (u) for (let p = 0; p < u.childNodes.length; p += 1) {
			const e = u.childNodes[p];
			e?.nodeType === e.ELEMENT_NODE && d.push(...await ra(e, t, n, r, o, i, a));
		}
		for (const p of d) p.sdtWrappers = [c, ...p.sdtWrappers ?? []];
		return d;
	}
	function ia(e, t, n, r, o) {
		return (i) => async function(e, t, n, r, o, i) {
			const a = ia(t, n, r, o, i), s = [];
			for (let l = 0; l < e.childNodes.length; l += 1) {
				const c = e.childNodes[l];
				c?.nodeType === c.ELEMENT_NODE && s.push(...await ra(c, t, n, r, o, i, a));
			}
			return s;
		}(i, e, t, n, r, o);
	}
	async function aa(e, t, n, r, o, i, a) {
		if (!e) return [];
		const s = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!s) return [];
		const l = ia(t, n, r, o, i), c = [];
		for (let u = 0; u < s.childNodes.length; u += 1) {
			const e = s.childNodes[u];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const a = e;
			"p" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI ? c.push(await Qi(a, t, n, r, o, i, l)) : "tbl" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI && c.push(await na(a, 0, 0, 0, 0, i, l));
		}
		return c;
	}
	const sa = /* @__PURE__ */ new Set([
		"separator",
		"continuationSeparator",
		"continuationNotice"
	]);
	async function la(e, t, n, r, o, i, a, s) {
		const l = {
			byDocxId: /* @__PURE__ */ new Map(),
			notes: { items: {} }
		};
		if (!t) return l;
		const c = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
		if (!c) return l;
		const u = {}, d = /* @__PURE__ */ new Map();
		let p, f;
		const h = Yt(c, Wt, e);
		let m = 0;
		const g = ia(n, r, o, i, a);
		for (const w of h) {
			const t = nn(w, "id") ?? "", s = nn(w, "type") ?? "", l = [];
			for (let e = 0; e < w.childNodes.length; e += 1) {
				const t = w.childNodes[e];
				if (t?.nodeType !== t.ELEMENT_NODE) continue;
				const s = t;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === s.namespaceURI && ("p" === s.localName ? l.push(await Qi(s, n, r, o, i, a, g)) : "tbl" === s.localName && l.push(await na(s, 0, 0, 0, 0, a, g)));
			}
			if (sa.has(s)) {
				"separator" === s ? p = l : "continuationSeparator" === s && (f = l);
				continue;
			}
			if (("-1" === t || "0" === t) && 0 === l.length) continue;
			m += 1;
			const c = `${e}:imported:${m}`, h = Number.parseInt(t, 10), b = {
				id: c,
				blocks: l.length > 0 ? l : [],
				docxId: Number.isFinite(h) ? h : void 0
			};
			u[c] = b, t && d.set(t, b);
		}
		return {
			byDocxId: d,
			notes: {
				items: u,
				separator: p,
				continuationSeparator: f
			},
			separator: p,
			continuationSeparator: f
		};
	}
	function* ca(e, t) {
		const n = Me(e);
		for (const r of n) {
			const e = [
				r.header ?? [],
				r.firstPageHeader ?? [],
				r.evenPageHeader ?? [],
				r.blocks,
				r.footer ?? [],
				r.firstPageFooter ?? [],
				r.evenPageFooter ?? []
			];
			for (const n of e) for (const e of n) for (const n of Oe(e)) for (const e of n.runs) e.kind === t && (yield {
				paragraph: n,
				run: e
			});
		}
	}
	function ua(e, t, n) {
		if (!e) return {
			blocks: e,
			changed: !1
		};
		let r = !1;
		const o = e.map((e) => {
			switch (e.type) {
				case "paragraph": {
					const o = function(e, t, n) {
						let r = !1;
						const o = e.runs.map((e) => {
							const o = t.getRef(e);
							if (!o) return e;
							const i = n.get(o.id);
							return void 0 === i || e.text === i ? e : (r = !0, {
								...e,
								text: i
							});
						});
						return r ? {
							...e,
							runs: o
						} : e;
					}(e, t, n);
					return o !== e && (r = !0), o;
				}
				case "table": {
					let o = !1;
					const i = e.rows.map((e) => {
						let r = !1;
						const i = e.cells.map((e) => {
							const o = ua(e.blocks, t, n);
							return o.changed && o.blocks ? (r = !0, {
								...e,
								blocks: o.blocks
							}) : e;
						});
						return r ? (o = !0, {
							...e,
							cells: i
						}) : e;
					});
					return o ? (r = !0, {
						...e,
						rows: i
					}) : e;
				}
				default: return pe(e, "block");
			}
		});
		return {
			blocks: r ? o : e,
			changed: r
		};
	}
	function da(e, t, n) {
		const r = t.settings?.numberFormat ?? "decimal", o = t.settings?.startAt ?? 1, i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
		let s = o - 1;
		for (const { run: p } of ca(e, n.runKind)) {
			const e = n.getRef(p);
			e && (i.add(e.id), e.customMark ? a.set(e.id, e.customMark) : a.has(e.id) || (s += 1, a.set(e.id, n.formatMarker(s, r))));
		}
		let l = !1;
		const c = Me(e).map((e) => {
			const t = ua(e.blocks, n, a), r = ua(e.header, n, a), o = ua(e.firstPageHeader, n, a), i = ua(e.evenPageHeader, n, a), s = ua(e.footer, n, a), c = ua(e.firstPageFooter, n, a), u = ua(e.evenPageFooter, n, a);
			return t.changed || r.changed || o.changed || i.changed || s.changed || c.changed || u.changed ? (l = !0, {
				...e,
				blocks: t.blocks ?? e.blocks,
				header: r.blocks,
				firstPageHeader: o.blocks,
				evenPageHeader: i.blocks,
				footer: s.blocks,
				firstPageFooter: c.blocks,
				evenPageFooter: u.blocks
			}) : e;
		}), u = {};
		let d = !1;
		for (const [p, f] of Object.entries(t.items)) i.has(p) || void 0 !== f.docxId ? u[p] = f : d = !0;
		return {
			sections: c,
			sectionsChanged: l,
			nextItems: u,
			itemsChanged: d
		};
	}
	const pa = [
		"*",
		"†",
		"‡",
		"§",
		"¶",
		"#"
	];
	function fa(e, t = "decimal") {
		switch (t) {
			case "lowerRoman":
			case "upperRoman":
			case "lowerLetter":
			case "upperLetter": return At(e, t, "en-US");
			case "symbol": {
				const t = (e - 1) % pa.length, n = Math.floor((e - 1) / pa.length) + 1;
				return pa[t].repeat(n);
			}
			default: return String(e);
		}
	}
	const ha = {
		runKind: "footnoteReference",
		getRef: (e) => {
			const t = fe(e);
			return t ? {
				id: t.footnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: fa
	};
	const ma = {
		runKind: "endnoteReference",
		getRef: (e) => {
			const t = he(e);
			return t ? {
				id: t.endnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: fa
	};
	const ga = /* @__PURE__ */ new Set(["_GoBack"]);
	function wa(e, t, n) {
		if ("paragraph" === e.type) {
			let r = 0;
			const o = [];
			for (const i of e.runs) {
				const a = i.__importedBookmark;
				a ? (t.push({
					marker: a,
					anchor: {
						paragraphId: e.id,
						offset: r,
						seq: n.value
					}
				}), n.value += 1) : (r += i.text.length, o.push(i));
			}
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [Y("")]);
			return;
		}
		for (const r of e.rows) for (const e of r.cells) for (const r of e.blocks) wa(r, t, n);
	}
	function ba(e) {
		const t = [], n = { value: 0 }, r = (e) => {
			e?.forEach((e) => wa(e, t, n));
		};
		for (const c of e) r(c.blocks), r(c.header), r(c.firstPageHeader), r(c.evenPageHeader), r(c.footer), r(c.firstPageFooter), r(c.evenPageFooter);
		if (0 === t.length) return;
		const o = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
		for (const c of t) {
			const e = "start" === c.marker.kind ? o : i, t = e.get(c.marker.docxId);
			t ? t.push(c) : e.set(c.marker.docxId, [c]);
		}
		const a = {}, s = [], l = t.filter((e) => "start" === e.marker.kind);
		for (const c of l) {
			const { marker: e, anchor: t } = c, n = e.name;
			if (!n || ga.has(n)) continue;
			const r = Number.parseInt(e.docxId, 10), o = i.get(e.docxId)?.shift(), l = X(), u = {
				id: l,
				name: n,
				start: t
			};
			n.startsWith("_") && (u.hidden = !0), Number.isNaN(r) || (u.docxIdHint = r), void 0 !== e.colFirst && (u.colFirst = e.colFirst), void 0 !== e.colLast && (u.colLast = e.colLast), o && (u.end = o.anchor), a[l] = u, s.push(l);
		}
		return 0 !== s.length ? {
			items: a,
			order: s
		} : void 0;
	}
	function va(e, t, n) {
		if ("paragraph" === e.type) {
			let r = 0;
			const o = [];
			for (const i of e.runs) {
				const a = i.__importedComment;
				a ? (t.push({
					marker: a,
					anchor: {
						paragraphId: e.id,
						offset: r,
						seq: n.value
					}
				}), n.value += 1) : (r += i.text.length, o.push(i));
			}
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [Y("")]);
			return;
		}
		for (const r of e.rows) for (const e of r.cells) for (const r of e.blocks) va(r, t, n);
	}
	function ya(e) {
		const t = [], n = { value: 0 }, r = (e) => {
			e?.forEach((e) => va(e, t, n));
		};
		for (const i of e) r(i.blocks), r(i.header), r(i.firstPageHeader), r(i.evenPageHeader), r(i.footer), r(i.firstPageFooter), r(i.evenPageFooter);
		const o = /* @__PURE__ */ new Map();
		for (const { marker: i, anchor: a } of t) {
			const e = o.get(i.docxId) ?? {};
			"start" === i.kind ? e.start = a : e.end = a, o.set(i.docxId, e);
		}
		return o;
	}
	const xa = "http://schemas.microsoft.com/office/word/2012/wordml";
	function Sa(e) {
		let t = "";
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			if (r?.nodeType !== r.ELEMENT_NODE) continue;
			const o = r;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI) {
				if ("t" === o.localName) {
					t += o.textContent ?? "";
					continue;
				}
				if ("tab" === o.localName) {
					t += "	";
					continue;
				}
				if ("br" === o.localName || "cr" === o.localName) {
					t += "\n";
					continue;
				}
			}
			t += Sa(o);
		}
		return t;
	}
	function Na(e) {
		if (!e) return;
		const t = Date.parse(e);
		return Number.isNaN(t) ? void 0 : t;
	}
	function Ea(e, t) {
		const n = /* @__PURE__ */ new Map();
		if (!e) return n;
		const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!r) return n;
		const o = function(e) {
			const t = /* @__PURE__ */ new Map();
			if (!e) return t;
			const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!n) return t;
			for (const r of Yt(n, xa, "commentEx")) {
				const e = r.getAttributeNS(xa, "paraId");
				if (!e) continue;
				const n = r.getAttributeNS(xa, "done"), o = r.getAttributeNS(xa, "paraIdParent") || void 0;
				t.set(e, {
					resolved: "1" === n || "true" === n,
					...o ? { parentParaId: o } : {}
				});
			}
			return t;
		}(t);
		for (const i of Yt(r, Wt, "comment")) {
			const e = nn(i, "id");
			if (null === e) continue;
			const t = nn(i, "author") ?? "", r = nn(i, "initials") ?? void 0, a = Na(nn(i, "date")), s = Na(i.getAttributeNS("http://schemas.microsoft.com/office/word/2023/wordml/word16du", "dateUtc")), l = Yt(i, Wt, "p"), c = l.map((e) => Sa(e)).join("\n").trim(), u = l.length > 0 ? nn(l[0], "paraId") ?? void 0 : void 0, d = void 0 !== u ? o.get(u) : void 0;
			n.set(e, {
				author: t,
				...r ? { initials: r } : {},
				...void 0 !== a ? { date: a } : {},
				...void 0 !== s ? { dateUtc: s } : {},
				text: c,
				...d?.resolved ? { resolved: !0 } : {},
				...u ? { paraId: u } : {},
				...d?.parentParaId ? { parentParaId: d.parentParaId } : {}
			});
		}
		return n;
	}
	async function ka(e, t = {}) {
		t.onProgress?.("opening-docx");
		const n = await w.default.loadAsync(e), r = await D(n), o = await W(n), i = await n.file("word/document.xml")?.async("string");
		if (!i) throw new Error("Missing word/document.xml");
		const a = Sn(await n.file("word/_rels/document.xml.rels")?.async("string")), s = cr(await n.file("word/numbering.xml")?.async("string") ?? null), l = await n.file("word/settings.xml")?.async("string") ?? null, c = function(e) {
			const t = { adjustLineHeightInTable: !0 };
			if (!e) return t;
			const n = new b.DOMParser().parseFromString(e, "application/xml"), r = Cn(nn(Jt(n.documentElement, Wt, "defaultTabStop"), "val"));
			void 0 !== r && Number.isFinite(r) && r > 0 && (t.defaultTabStop = r);
			const o = Jt(n.documentElement, Wt, "autoHyphenation");
			if (o) {
				const e = nn(o, "val");
				t.autoHyphenation = "0" !== e && "false" !== e;
			}
			const i = Jt(n.documentElement, Wt, "doNotHyphenateCaps");
			if (i) {
				const e = nn(i, "val");
				t.doNotHyphenateCaps = "0" !== e && "false" !== e;
			}
			const a = Number.parseInt(nn(Jt(n.documentElement, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "consecutiveHyphenLimit"), "val") ?? "", 10);
			Number.isFinite(a) && a >= 0 && (t.consecutiveHyphenLimit = a);
			const s = Cn(nn(Jt(n.documentElement, Wt, "hyphenationZone"), "val"));
			void 0 !== s && (t.hyphenationZone = s), t.footnoteSettings = Bn(Jt(n.documentElement, Wt, "footnotePr")), t.endnoteSettings = Bn(Jt(n.documentElement, Wt, "endnotePr"));
			const l = Jt(n.documentElement, Wt, "compat");
			if (l) {
				const e = Jt(l, Wt, "adjustLineHeightInTable");
				if (e) {
					const n = nn(e, "val");
					t.adjustLineHeightInTable = "0" !== n && "false" !== n;
				}
				const n = Jt(l, Wt, "allowSpaceOfSameStyleInTable");
				if (n) {
					const e = nn(n, "val");
					t.allowSpaceOfSameStyleInTable = "0" !== e && "false" !== e;
				}
			}
			return t;
		}(l), u = function(e) {
			if (!(!e || e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
				const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
				if (!t || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== t.namespaceURI || "settings" !== t.localName) return;
				const n = rr(t, Wt, "docVars");
				if (1 !== n.length) return;
				const r = rr(n[0], Wt, "docVar");
				if (r.length > 256) return;
				const o = /* @__PURE__ */ new Map();
				for (const e of r) {
					const t = e.getAttributeNS(Wt, "name"), n = e.getAttributeNS(Wt, "val");
					if (null === t || null === n || !tr(t) || !nr(n)) continue;
					const r = t.toLowerCase();
					"__proto__" !== r && "constructor" !== r && "prototype" !== r && (o.has(r) ? o.set(r, null) : o.set(r, {
						name: t,
						value: n
					}));
				}
				const i = Object.create(null);
				for (const e of o.values()) e && (i[e.name] = e.value);
				return Object.keys(i).length ? i : void 0;
			} catch {
				return;
			}
		}(l), d = await n.file("word/styles.xml")?.async("string") ?? null, p = function(e) {
			if (!e) return;
			const t = new b.DOMParser().parseFromString(e, "application/xml").getElementsByTagNameNS(Wt, "fonts")[0];
			if (!t) return;
			const n = [];
			for (const r of Yt(t, Wt, "font")) {
				const e = nn(r, "name");
				if (!e) continue;
				const t = { name: e }, o = nn(Jt(r, Wt, "altName"), "val");
				o && (t.altName = o);
				const i = nn(Jt(r, Wt, "family"), "val");
				i && (t.family = i);
				const a = nn(Jt(r, Wt, "pitch"), "val");
				a && (t.pitch = a);
				const s = nn(Jt(r, Wt, "charset"), "val");
				s && (t.charset = s);
				const l = nn(Jt(r, Wt, "panose1"), "val");
				l && (t.panose1 = l);
				const c = Jt(r, Wt, "sig");
				if (c) {
					const e = {};
					for (let t = 0; t < c.attributes.length; t += 1) {
						const n = c.attributes[t];
						e[n.localName ?? n.name] = n.value;
					}
					Object.keys(e).length > 0 && (t.sig = e);
				}
				n.push(t);
			}
			return n.length > 0 ? n : void 0;
		}(await n.file("word/fontTable.xml")?.async("string") ?? null), f = await n.file("word/theme/theme1.xml")?.async("string") ?? null, h = null !== f, m = Fn(f), g = function(e, t, n) {
			if (!e) return;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return;
			const o = Jt(r, Wt, "docDefaults"), i = Jt(Jt(o, Wt, "pPrDefault"), Wt, "pPr"), a = Jt(Jt(o, Wt, "rPrDefault"), Wt, "rPr"), s = i ? {
				spacingBefore: 0,
				spacingAfter: 0,
				...zr(Hr(i, t.colors))
			} : zr(Hr(i, t.colors)), l = Er(a, t), c = {};
			let u;
			for (const d of Yt(r, Wt, "style")) {
				const e = nn(d, "styleId"), r = nn(d, "type");
				if (!e || "paragraph" !== r && "character" !== r && "table" !== r) continue;
				const o = nn(Jt(d, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "name"), "val") ?? e, i = nn(d, "customStyle"), a = null == i ? void 0 : an(i), p = hr({
					id: e,
					name: o,
					type: r,
					customStyle: a
				}), f = nn(Jt(d, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "basedOn"), "val") ?? void 0, h = nn(Jt(d, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "next"), "val") ?? void 0, m = sn(d, "qFormat"), g = sn(d, "semiHidden"), w = sn(d, "unhideWhenUsed"), b = nn(Jt(d, Wt, "uiPriority"), "val"), v = null === b ? NaN : Number(b), y = Number.isInteger(v) && v >= 0 ? v : void 0, x = zr(Hr(Jt(d, Wt, "pPr"), t.colors));
				if (n && "paragraph" === r && !x.list) {
					const e = dr(Jt(d, Wt, "pPr"), n, { trackInstance: !1 });
					e && (x.list = e.list);
				}
				const S = Er(Jt(d, Wt, "rPr"), t);
				let N;
				if ("table" === r) {
					const n = Jt(d, Wt, "tblPr"), r = (e) => {
						const t = nn(Jt(n, Wt, e), "val"), r = t ? Number(t) : NaN;
						return Number.isFinite(r) && r > 0 ? Math.floor(r) : void 0;
					}, o = r("tblStyleRowBandSize"), i = r("tblStyleColBandSize"), a = {};
					for (const e of Yt(d, Wt, "tblStylePr")) {
						const n = nn(e, "type");
						if (!n) continue;
						const r = Jt(e, Wt, "tcPr"), o = Lr(r, void 0, t.colors), i = Dr(Jt(e, Wt, "tblPr")), s = yr(Jt(r, Wt, "shd"), t.colors), l = Er(Jt(e, Wt, "rPr"), t), c = br(gr(Jt(r, Wt, "tcBorders"))), u = Hr(Jt(e, Wt, "pPr"), t.colors), d = Pr(Jt(e, Wt, "trPr"));
						(s || l || c || u || d || o || i) && (a[n] = {
							...s ? { shading: s } : {},
							...l ? { textStyle: l } : {},
							...c ? { borders: c } : {},
							...u ? { paragraphStyle: u } : {},
							...d ? { rowStyle: d } : {},
							...o ? { cellStyle: o } : {},
							...i ? { tableStyle: i } : {}
						});
					}
					N = {
						...Dr(n, e) ?? { styleId: e },
						...void 0 !== o ? { rowBandSize: o } : {},
						...void 0 !== i ? { colBandSize: i } : {},
						...Object.keys(a).length > 0 ? { conditionalFormats: a } : {}
					};
				}
				const E = "paragraph" === r && an(nn(d, "default"));
				E && (u = e), c[e] = {
					id: e,
					name: o,
					type: r,
					...p ? { builtinStyle: p } : {},
					...void 0 !== a ? { customStyle: a } : {},
					isDefault: an(nn(d, "default")),
					basedOn: f,
					nextStyle: h,
					qFormat: m,
					uiPriority: y,
					semiHidden: g,
					unhideWhenUsed: w,
					paragraphStyle: "paragraph" === r && E ? vr(s, x) : x,
					textStyle: "paragraph" === r && E ? vr(l, S) : S,
					tableStyle: N
				};
			}
			for (const d of Object.values(c)) {
				let e = d.basedOn;
				const t = /* @__PURE__ */ new Set([d.id]);
				for (; e && !t.has(e);) {
					t.add(e);
					const n = c[e];
					if (!n) break;
					!d.paragraphStyle?.list && n.paragraphStyle?.list && ((d.paragraphStyle ??= {}).list = { ...n.paragraphStyle.list }), e = n.basedOn;
				}
			}
			return u && c[u] ? c : ((s || l) && (c.Normal = {
				id: "Normal",
				name: "Normal",
				type: "paragraph",
				builtinStyle: "normal",
				paragraphStyle: s,
				textStyle: l
			}), br(c));
		}(d, m, s);
		t.onProgress?.("parsing-document");
		const v = new b.DOMParser().parseFromString(i, "application/xml"), y = v.documentElement ? Jt(v.documentElement, Wt, "background") : null, x = y?.getAttribute("w:color") ?? y?.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "color") ?? null, S = v.getElementsByTagNameNS(Wt, "body")[0];
		if (!S) return {
			...Dt([K([{ text: "" }])]),
			...r ? { coreTimestamps: r } : {},
			...u ? { documentVariables: u } : {},
			...o ? { documentProperties: o } : {}
		};
		const N = {
			assets: {},
			byPath: /* @__PURE__ */ new Map(),
			nextId: 1
		}, E = Sn(await n.file("word/_rels/numbering.xml.rels")?.async("string") ?? null);
		for (const [w, b] of s.parsedPictureBullets) {
			const e = b.relationshipId ? E.get(b.relationshipId) : void 0;
			if (!e) continue;
			const t = await fn(n, N, e);
			t && s.pictureBullets.set(w, xn(b, t));
		}
		let k = null;
		const T = [], I = [[]];
		let _ = !1, C = null;
		const A = (e) => {
			_ && (e.style = {
				...e.style ?? {},
				pageBreakBefore: !0
			}, _ = !1), C && "paragraph" === e.type && (e.dropCap = C, C = null), I[I.length - 1].push(e);
		};
		let R = 0;
		for (let w = 0; w < S.childNodes.length; w += 1) {
			const e = S.childNodes[w];
			if (e?.nodeType === e.ELEMENT_NODE) {
				const t = e;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && "sectPr" !== t.localName && (R += 1);
			}
		}
		let $ = 0;
		const P = () => {
			$ += 1, R > 0 && t.onProgress?.("parsing-document", $ / R);
		}, M = ia(s, n, a, N, m);
		for (let w = 0; w < S.childNodes.length; w += 1) {
			const e = S.childNodes[w];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const t = e;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI) {
				if ("sectPr" === t.localName) T.push(Gr(t)), I.push([]), _ = !1;
				else if ("p" === t.localName) {
					const e = await Yi(t, s, n, a, N, m, M);
					for (const t of e.paragraphs) A(t);
					e.dropCapFrame && (C = e.dropCapFrame), e.pageBreakAfter && (_ = !0);
					const r = Jt(t, Wt, "pPr"), o = r ? Jt(r, Wt, "sectPr") : null;
					o && (T.push(Gr(o)), I.push([]), _ = !1), P();
				} else if ("tbl" === t.localName) A(await na(t, 0, 0, 0, 0, m, M)), P();
				else if ("sdt" === t.localName) {
					for (const e of await oa(t, s, n, a, N, m, M)) A(e);
					P();
				}
				await cn(50, $);
			}
		}
		if (0 === T.length) {
			const e = Jt(S, Wt, "sectPr");
			T.push(e ? Gr(e) : {
				pageSettings: Vr(S),
				headerRIds: {},
				footerRIds: {}
			});
		}
		t.onProgress?.("parsing-headers-footers");
		const F = [], O = (e) => Object.keys(e.headerRIds).length > 0 || Object.keys(e.footerRIds).length > 0, L = T.filter(O).length;
		let B = 0;
		const U = () => {
			B += 1, L > 0 && t.onProgress?.("parsing-headers-footers", B / L);
		};
		for (let w = 0; w < T.length; w += 1) {
			const e = T[w], t = I[w] ?? [];
			Xr(t, e.docGridLinePitchPx, e.docGridMode, e.docGridType, c);
			const r = async (t) => {
				if (!t) return [];
				const r = a.get(t);
				if (!r) return [];
				let o = r.startsWith("/") ? r.slice(1) : r;
				o.startsWith("word/") || (o = `word/${r}`);
				const i = await n.file(o)?.async("string"), l = await Nn(n, o);
				if (!k && i) {
					const e = i.match(/<v:textpath[^>]*string="([^"]+)"/i), t = i.match(/<v:shape\b([^>]*)>/i)?.[1] ?? "", r = (e) => t.match(new RegExp(`${e}="([^"]+)"`, "i"))?.[1], o = (e) => e.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
					if (e?.[1]) k = {
						kind: "text",
						text: o(e[1]),
						color: r("fillcolor"),
						opacity: Number(r("fillopacity")) || void 0,
						rotation: Number(r("rotation")) || void 0
					};
					else {
						const e = i.match(/<v:imagedata[^>]*(?:r:id|id)="([^"]+)"/i)?.[1], t = e ? l.get(e) : void 0;
						if (t) {
							const e = t.startsWith("../") ? `word/${t.slice(3)}` : t, o = await fn(n, N, e);
							o && (k = {
								kind: "image",
								src: o,
								color: r("fillcolor"),
								opacity: Number(r("fillopacity")) || void 0,
								rotation: Number(r("rotation")) || void 0
							});
						}
					}
				}
				const u = await aa(i ?? null, s, n, l, N, m);
				return Xr(u, e.docGridLinePitchPx, e.docGridMode, e.docGridType, c), u;
			}, o = await r(e.headerRIds.default), i = await r(e.headerRIds.first), l = await r(e.headerRIds.even), u = await r(e.footerRIds.default), d = await r(e.footerRIds.first), p = await r(e.footerRIds.even);
			O(e) && U(), await cn(2, B);
			const f = Se(e.pageSettings ?? {
				width: 816,
				height: 1056,
				orientation: "portrait",
				margins: {
					top: 96,
					right: 96,
					bottom: 96,
					left: 96,
					header: 48,
					footer: 48,
					gutter: 0
				}
			}), h = w > 0 ? T[w - 1]?.breakType : void 0, g = e.pageNumbering, b = e.verticalAlignment, v = e.bidi, y = e.propertyRevision ? {
				...e.propertyRevision,
				previous: {
					...e.propertyRevision.previous,
					pageSettings: Se(e.propertyRevision.previous.pageSettings)
				}
			} : void 0;
			F.push({
				id: `section:${w + 1}`,
				blocks: t.length > 0 ? t : [K([{ text: "" }])],
				pageSettings: f,
				...e.pageBorder ? { pageBorder: e.pageBorder } : {},
				header: o.length > 0 ? o : void 0,
				firstPageHeader: i.length > 0 ? i : void 0,
				evenPageHeader: l.length > 0 ? l : void 0,
				footer: u.length > 0 ? u : void 0,
				firstPageFooter: d.length > 0 ? d : void 0,
				evenPageFooter: p.length > 0 ? p : void 0,
				...h ? { breakType: h } : {},
				...g ? { pageNumbering: g } : {},
				...b ? { verticalAlignment: b } : {},
				...v ? { bidi: v } : {},
				...y ? { propertyRevision: y } : {}
			});
		}
		const z = await n.file("word/footnotes.xml")?.async("string") ?? null, j = await async function(e, t, n, r, o, i) {
			const a = await la("footnote", e, t, n, r, o, i);
			return {
				byDocxId: a.byDocxId,
				footnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(z, s, n, z ? await Nn(n, "word/footnotes.xml") : /* @__PURE__ */ new Map(), N, m);
		c.footnoteSettings && (j.footnotes.settings = c.footnoteSettings);
		const q = Object.keys(j.footnotes.items).length > 0 || j.footnotes.separator || j.footnotes.continuationSeparator || j.footnotes.settings ? j.footnotes : void 0;
		(function(e, t) {
			const n = (e) => {
				if ("paragraph" !== e.type) for (const t of e.rows) for (const e of t.cells) for (const t of e.blocks) n(t);
				else e.runs.forEach((n, r) => {
					const o = n, i = o.__importedFootnoteRef;
					if (!i) return;
					delete o.__importedFootnoteRef;
					const a = t.get(i.docxId);
					a && (e.runs[r] = {
						id: n.id,
						text: n.text,
						styles: n.styles,
						revision: n.revision,
						kind: "footnoteReference",
						footnoteReference: {
							footnoteId: a.id,
							...i.customMark ? { customMark: i.customMark } : {}
						}
					});
				});
			};
			Ta(e, n);
		})(F, j.byDocxId);
		const G = await n.file("word/endnotes.xml")?.async("string") ?? null, X = await async function(e, t, n, r, o, i) {
			const a = await la("endnote", e, t, n, r, o, i);
			return {
				byDocxId: a.byDocxId,
				endnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(G, s, n, G ? await Nn(n, "word/endnotes.xml") : /* @__PURE__ */ new Map(), N, m);
		c.endnoteSettings && (X.endnotes.settings = c.endnoteSettings);
		const Y = Object.keys(X.endnotes.items).length > 0 || X.endnotes.separator || X.endnotes.continuationSeparator || X.endnotes.settings ? X.endnotes : void 0;
		(function(e, t) {
			const n = (e) => {
				if ("paragraph" !== e.type) for (const t of e.rows) for (const e of t.cells) for (const t of e.blocks) n(t);
				else e.runs.forEach((n, r) => {
					const o = n, i = o.__importedEndnoteRef;
					if (!i) return;
					delete o.__importedEndnoteRef;
					const a = t.get(i.docxId);
					a && (e.runs[r] = {
						id: n.id,
						text: n.text,
						styles: n.styles,
						revision: n.revision,
						kind: "endnoteReference",
						endnoteReference: {
							endnoteId: a.id,
							...i.customMark ? { customMark: i.customMark } : {}
						}
					});
				});
			};
			Ta(e, n);
		})(F, X.byDocxId);
		const Q = ba(F), J = function(e, t) {
			const n = /* @__PURE__ */ new Set([...e.keys(), ...t.keys()]);
			if (0 === n.size) return;
			const r = [...n].sort((e, t) => {
				const n = Number.parseInt(e, 10), r = Number.parseInt(t, 10);
				return Number.isNaN(n) || Number.isNaN(r) ? e.localeCompare(t) : n - r;
			}), o = /* @__PURE__ */ new Map();
			for (const l of r) o.set(l, Z());
			const i = /* @__PURE__ */ new Map();
			for (const [l, c] of t) {
				const e = o.get(l);
				e && c.paraId && i.set(c.paraId, e);
			}
			const a = {}, s = [];
			for (const l of r) {
				const n = e.get(l), r = t.get(l);
				if (!n && !r) continue;
				const c = o.get(l), u = r?.parentParaId ? i.get(r.parentParaId) : void 0, d = Number.parseInt(l, 10);
				a[c] = {
					id: c,
					author: r?.author ?? "",
					...r?.initials ? { initials: r.initials } : {},
					...void 0 !== r?.date ? { date: r.date } : {},
					...void 0 !== r?.dateUtc ? { dateUtc: r.dateUtc } : {},
					...r?.resolved ? { resolved: r.resolved } : {},
					...u ? { parentId: u } : {},
					text: r?.text ?? "",
					...n?.start ? { start: n.start } : {},
					...n?.end ? { end: n.end } : {},
					...Number.isNaN(d) ? {} : { docxIdHint: d }
				}, s.push(c);
			}
			return s.length > 0 ? {
				items: a,
				order: s
			} : void 0;
		}(ya(F), Ea(await n.file("word/comments.xml")?.async("string") ?? null, await n.file("word/commentsExtended.xml")?.async("string") ?? null)), ee = F.length > 1 || F.some((e) => (e.header?.length ?? 0) > 0 || (e.firstPageHeader?.length ?? 0) > 0 || (e.evenPageHeader?.length ?? 0) > 0 || (e.footer?.length ?? 0) > 0 || (e.firstPageFooter?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0 || void 0 !== e.breakType || void 0 !== e.pageNumbering || void 0 !== e.verticalAlignment || void 0 !== e.bidi || void 0 !== e.pageBorder), te = Object.keys(N.assets).length > 0, ne = (e) => {
			if (h) {
				const t = m.data?.name?.toLowerCase() ?? "", n = [
					"oasis",
					"office",
					"facet",
					"integral",
					"ion",
					"retrospect"
				].find((e) => t.includes(e));
				e.design = {
					...e.design ?? {},
					...n ? { themeId: n } : {},
					...m.data ? { themeData: m.data } : {}
				};
			}
			x && (e.design = {
				...e.design ?? {},
				pageColor: `#${x.replace(/^#/, "")}`
			}), k && (e.design = {
				...e.design ?? {},
				watermark: k
			});
			const t = {};
			void 0 !== c.defaultTabStop && (t.defaultTabStop = c.defaultTabStop), c.allowSpaceOfSameStyleInTable && (t.allowSpaceOfSameStyleInTable = !0), c.autoHyphenation && (t.autoHyphenation = !0), c.doNotHyphenateCaps && (t.doNotHyphenateCaps = !0), void 0 !== c.consecutiveHyphenLimit && (t.consecutiveHyphenLimit = c.consecutiveHyphenLimit), void 0 !== c.hyphenationZone && (t.hyphenationZone = c.hyphenationZone), Object.keys(t).length > 0 && (e.settings = {
				...e.settings ?? {},
				...t
			}), p && (e.fontTable = p), r && (e.coreTimestamps = r), o && (e.documentProperties = o), u && (e.documentVariables = u);
			let n = e;
			return q && (n.footnotes = q, n = function(e) {
				const t = e.footnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: n, sectionsChanged: r, nextItems: o, itemsChanged: i } = da(e, t, ha);
				return r || i ? {
					...e,
					sections: r ? n : e.sections,
					footnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(n)), Y && (n.endnotes = Y, n = function(e) {
				const t = e.endnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: n, sectionsChanged: r, nextItems: o, itemsChanged: i } = da(e, t, ma);
				return r || i ? {
					...e,
					sections: r ? n : e.sections,
					endnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(n)), Q && (n.bookmarks = Q), J && (n.comments = J), n;
		};
		if (ee) {
			const e = Dt([]);
			return e.sections = F, 1 === F.length && (e.pageSettings = F[0].pageSettings), g && (e.styles = g), te && (e.assets = N.assets), ne(e);
		}
		const re = F[0], oe = Dt(re?.blocks.length > 0 ? re.blocks : [K([{ text: "" }])], re?.pageSettings);
		return te && (oe.assets = N.assets), g && (oe.styles = g), ne(oe);
	}
	function Ta(e, t) {
		for (const n of e) n.blocks.forEach(t), n.header?.forEach(t), n.firstPageHeader?.forEach(t), n.evenPageHeader?.forEach(t), n.footer?.forEach(t), n.firstPageFooter?.forEach(t), n.evenPageFooter?.forEach(t);
	}
	function Ia(e) {
		if ("end" === e.kind) return `<w:bookmarkEnd w:id="${e.wId}"/>`;
		const t = (void 0 !== e.colFirst ? ` w:colFirst="${e.colFirst}"` : "") + (void 0 !== e.colLast ? ` w:colLast="${e.colLast}"` : "");
		return `<w:bookmarkStart w:id="${e.wId}" w:name="${Zn(e.name ?? "")}"${t}/>`;
	}
	function _a(e) {
		switch (e.kind) {
			case "start": return `<w:commentRangeStart w:id="${e.wId}"/>`;
			case "end": return `<w:commentRangeEnd w:id="${e.wId}"/>`;
			case "reference": return `<w:r><w:commentReference w:id="${e.wId}"/></w:r>`;
		}
	}
	const Ca = `xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"`;
	function Aa(e) {
		const t = e.comments.map(({ comment: e, wId: t, paraId: n }) => {
			const r = void 0 !== e.date ? ` w:date="${new Date(e.date).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", o = void 0 !== e.dateUtc ? ` w16du:dateUtc="${new Date(e.dateUtc).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", i = e.initials ? ` w:initials="${Zn(e.initials)}"` : "";
			return `<w:comment w:id="${t}" w:author="${Zn(e.author)}"${r}${o}${i}><w:p w14:paraId="${n}">${a = e.text, `<w:r>${a.split("\n").map((e, t) => `${t > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${Zn(e)}</w:t>`).join("")}</w:r>`}</w:p></w:comment>`;
			var a;
		}).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${Ca}>${t}</w:comments>`;
	}
	function Ra(e) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= 1;
	}
	function $a(e) {
		let t = 1;
		for (const r of Object.values(e)) Ra(r.docxId) && (t = Math.max(t, r.docxId + 1));
		const n = /* @__PURE__ */ new Set();
		return (e) => {
			if (Ra(e.docxId) && !n.has(e.docxId)) return n.add(e.docxId), e.docxId;
			for (; n.has(t);) t += 1;
			const r = t;
			return n.add(r), t += 1, r;
		};
	}
	const Da = [
		"pStyle",
		"keepNext",
		"keepLines",
		"pageBreakBefore",
		"framePr",
		"widowControl",
		"numPr",
		"suppressLineNumbers",
		"pBdr",
		"shd",
		"tabs",
		"suppressAutoHyphens",
		"kinsoku",
		"wordWrap",
		"overflowPunct",
		"topLinePunct",
		"autoSpaceDE",
		"autoSpaceDN",
		"bidi",
		"adjustRightInd",
		"snapToGrid",
		"spacing",
		"ind",
		"contextualSpacing",
		"mirrorIndents",
		"suppressOverlap",
		"jc",
		"textDirection",
		"textAlignment",
		"textboxTightWrap",
		"outlineLvl",
		"divId",
		"cnfStyle",
		"rPr",
		"sectPr",
		"pPrChange"
	], Pa = [
		"rStyle",
		"rFonts",
		"b",
		"bCs",
		"i",
		"iCs",
		"caps",
		"smallCaps",
		"strike",
		"dstrike",
		"outline",
		"shadow",
		"emboss",
		"imprint",
		"noProof",
		"snapToGrid",
		"vanish",
		"webHidden",
		"color",
		"spacing",
		"w",
		"kern",
		"position",
		"sz",
		"szCs",
		"highlight",
		"u",
		"effect",
		"bdr",
		"shd",
		"fitText",
		"vertAlign",
		"rtl",
		"cs",
		"em",
		"lang",
		"eastAsianLayout",
		"specVanish",
		"oMath",
		"rPrChange"
	], Ma = [
		"tblStyle",
		"tblpPr",
		"tblOverlap",
		"bidiVisual",
		"tblStyleRowBandSize",
		"tblStyleColBandSize",
		"tblW",
		"jc",
		"tblCellSpacing",
		"tblInd",
		"tblBorders",
		"shd",
		"tblLayout",
		"tblCellMar",
		"tblLook",
		"tblCaption",
		"tblDescription",
		"tblPrChange"
	], Fa = [
		"name",
		"aliases",
		"basedOn",
		"next",
		"link",
		"autoRedefine",
		"hidden",
		"uiPriority",
		"semiHidden",
		"unhideWhenUsed",
		"qFormat",
		"locked",
		"personal",
		"personalCompose",
		"personalReply",
		"rsid",
		"pPr",
		"rPr",
		"tblPr",
		"trPr",
		"tcPr",
		"tblStylePr"
	];
	function Oa(e, t) {
		const n = e.includes(":") ? e.split(":")[1] : e, r = t.indexOf(n);
		return r >= 0 ? r : 9999;
	}
	const La = [
		"cnfStyle",
		"tcW",
		"gridSpan",
		"hMerge",
		"vMerge",
		"tcBorders",
		"shd",
		"noWrap",
		"tcMar",
		"textDirection",
		"tcFitText",
		"vAlign",
		"hideMark",
		"headers",
		"cellIns",
		"cellDel",
		"cellMerge",
		"tcPrChange"
	];
	function Ba(e, t) {
		return e.map((e, n) => {
			const r = /^<w:([\w]+)(?=[\s/>])/.exec(e)?.[1], o = e.startsWith("<mc:AlternateContent") ? /<mc:Fallback>\s*<w:([\w]+)(?=[\s/>])/.exec(e)?.[1] : void 0, i = t.findIndex((e) => e.endsWith("PrChange"));
			return {
				xml: e,
				index: n,
				rank: r || o ? Oa(r ?? o, t) : i < 0 ? 9999 : i - .5
			};
		}).sort((e, t) => e.rank - t.rank || e.index - t.index).map((e) => e.xml).join("");
	}
	function Ua(e, t = "000000") {
		return "none" === e.type || e.width <= 0 ? "w:val=\"nil\"/>" : `w:val="${"dotted" === e.type ? "dotted" : "dashed" === e.type ? "dashed" : "single"}" w:sz="${Math.max(1, Math.round(8 * e.width))}" w:space="0" w:color="${Jn(e.color, t)}"/>`;
	}
	function za(e) {
		const t = [
			["top", e.borderTop],
			["left", e.borderLeft],
			["bottom", e.borderBottom],
			["right", e.borderRight],
			["between", e.borderBetween],
			["bar", e.borderBar]
		].filter((e) => null != e[1]).map(([e, t]) => `<w:${e} ${Ua(t)}`);
		return t.length > 0 ? `<w:pBdr>${t.join("")}</w:pBdr>` : "";
	}
	const Ha = "6F6F6F";
	function ja(e) {
		return e ? Object.entries(e).map(([e, t]) => ` ${e}="${Zn(t)}"`).join("") : "";
	}
	function qa(e) {
		const t = /^\d+$/.test(e.id) ? e.id : String(Array.from(e.id).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0)), n = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${t}" w:author="${Zn(e.author)}" w:date="${n}"`;
	}
	function Wa(e) {
		if (!e || 0 === Object.keys(e).length) return "";
		const t = kr.filter(([, t]) => void 0 !== e[t]).map(([t, n]) => `w:${t}="${e[n] ? "1" : "0"}"`).join(" ");
		return t ? `<w:cnfStyle ${t}/>` : "";
	}
	function Ga(e, t) {
		return void 0 === t ? "" : t ? `<w:${e}/>` : `<w:${e} w:val="0"/>`;
	}
	function Va(e, t, n = {}) {
		if ("number" == typeof t && Number.isFinite(t)) return `<w:${e} w:w="${Kn(t) ?? 0}" w:type="dxa"/>`;
		if ("string" == typeof t) {
			const n = t.trim();
			if ("auto" === n) return `<w:${e} w:w="0" w:type="auto"/>`;
			if (n.endsWith("%")) {
				const t = Number.parseFloat(n.slice(0, -1));
				if (Number.isFinite(t)) return `<w:${e} w:w="${Math.round(50 * t)}" w:type="pct"/>`;
			}
			const r = Number.parseFloat(n);
			if (Number.isFinite(r)) return `<w:${e} w:w="${Math.round(r)}" w:type="dxa"/>`;
		}
		return n.fallbackAuto ? `<w:${e} w:w="0" w:type="auto"/>` : "";
	}
	function Xa(e, t = !0) {
		return Va("tblW", e, { fallbackAuto: t });
	}
	function Za(e) {
		return Ua(e ?? {
			width: .75,
			type: "solid",
			color: `#${Ha}`
		}, Ha);
	}
	function Ya(e) {
		if (!e) return "";
		const t = [], n = (e, n) => {
			void 0 !== n && Number.isFinite(n) && t.push(`<w:${e} w:w="${Kn(n) ?? 0}" w:type="dxa"/>`);
		};
		return n("top", e.top), n("left", e.left), n("bottom", e.bottom), n("right", e.right), n("start", e.start), n("end", e.end), t.length > 0 ? `<w:tblCellMar>${t.join("")}</w:tblCellMar>` : "";
	}
	function Qa(e, t) {
		const n = Math.max(1, Math.floor(e.colSpan ?? 1)), r = [], o = Wa(e.conditionalStyle);
		o && r.push(o);
		const i = function(e) {
			return Va("tcW", e);
		}(e.style?.width ?? t);
		i && r.push(i), n > 1 && r.push(`<w:gridSpan w:val="${n}"/>`), "restart" === e.vMerge ? r.push("<w:vMerge w:val=\"restart\"/>") : "continue" === e.vMerge && r.push("<w:vMerge/>"), e.style?.shading && r.push(er(e.style.shading));
		const a = Ga("noWrap", e.style?.noWrap);
		a && r.push(a);
		const s = Ga("tcFitText", e.style?.fitText);
		if (s && r.push(s), e.style?.headers && r.push(`<w:headers w:val="${Zn(e.style.headers)}"/>`), e.style?.verticalAlign) {
			const t = "middle" === e.style.verticalAlign ? "center" : e.style.verticalAlign;
			r.push(`<w:vAlign w:val="${t}"/>`);
		}
		e.style?.textDirection && r.push(`<w:textDirection w:val="${e.style.textDirection}"/>`), r.push(function(e) {
			const t = e.style, n = t?.padding, r = Kn(n ?? t?.paddingTop ?? 0), o = Kn(n ?? t?.paddingBottom ?? 0);
			return `<w:tcMar><w:top w:w="${r ?? 0}" w:type="dxa"/><w:left w:w="${Kn(n ?? t?.paddingLeft ?? 5.4) ?? 0}" w:type="dxa"/><w:bottom w:w="${o ?? 0}" w:type="dxa"/><w:right w:w="${Kn(n ?? t?.paddingRight ?? 5.4) ?? 0}" w:type="dxa"/>${void 0 !== t?.paddingStart ? `<w:start w:w="${Kn(t.paddingStart) ?? 0}" w:type="dxa"/>` : ""}${void 0 !== t?.paddingEnd ? `<w:end w:w="${Kn(t.paddingEnd) ?? 0}" w:type="dxa"/>` : ""}</w:tcMar>`;
		}(e)), r.push(function(e) {
			const t = [
				`<w:top ${Za(e.style?.borderTop)}`,
				`<w:left ${Za(e.style?.borderLeft)}`,
				`<w:bottom ${Za(e.style?.borderBottom)}`,
				`<w:right ${Za(e.style?.borderRight)}`
			];
			return e.style?.borderStart && t.push(`<w:start ${Za(e.style.borderStart)}`), e.style?.borderEnd && t.push(`<w:end ${Za(e.style.borderEnd)}`), e.style?.borderTopLeftToBottomRight && t.push(`<w:tl2br ${Za(e.style.borderTopLeftToBottomRight)}`), e.style?.borderTopRightToBottomLeft && t.push(`<w:tr2bl ${Za(e.style.borderTopRightToBottomLeft)}`), `<w:tcBorders>${t.join("")}</w:tcBorders>`;
		}(e));
		const l = Ga("hideMark", e.style?.hideMark);
		if (l && r.push(l), e.style?.propertyRevision) {
			const t = e.style.propertyRevision, n = Qa({
				...e,
				style: t.previous
			});
			r.push(`<w:tcPrChange ${qa(t)}>${n}</w:tcPrChange>`);
		}
		if (e.style?.revision) {
			const t = e.style.revision, n = "insert" === t.type ? "cellIns" : "delete" === t.type ? "cellDel" : "cellMerge", o = "merge" === t.type ? `${t.previous?.vMerge ? ` w:vMergeOrig="${"restart" === t.previous.vMerge ? "rest" : "cont"}"` : ""}${e.vMerge ? ` w:vMerge="${"restart" === e.vMerge ? "rest" : "cont"}"` : ""}` : "";
			r.push(`<w:${n} ${qa(t)}${o}/>`);
		}
		return r.length > 0 ? `<w:tcPr>${Ba(r, La)}</w:tcPr>` : "";
	}
	function Ka(e, t) {
		if (void 0 === t || !Number.isFinite(t)) return "";
		const n = Math.floor(t);
		return n > 0 ? `<w:${e} w:val="${n}"/>` : "";
	}
	function Ja(e, t) {
		const n = "number" == typeof e ? Kn(e) : "string" == typeof e ? Number.parseFloat(e) : null, r = null !== n && Number.isFinite(n);
		if (!r && !t) return "";
		const o = [];
		return r && o.push(`w:val="${Math.round(n)}"`), o.push(`w:hRule="${t ?? "atLeast"}"`), `<w:trHeight ${o.join(" ")}/>`;
	}
	function es(e) {
		if (!e) return "";
		const t = [], n = Ka("gridBefore", e.gridBefore);
		n && t.push(n);
		const r = Ka("gridAfter", e.gridAfter);
		r && t.push(r);
		const o = Va("wBefore", e.widthBefore);
		o && t.push(o);
		const i = Va("wAfter", e.widthAfter);
		i && t.push(i);
		const a = Va("tblCellSpacing", e.cellSpacing);
		a && t.push(a);
		const s = Ja(e.height, e.heightRule);
		s && t.push(s);
		const l = Ga("cantSplit", e.cantSplit);
		l && t.push(l);
		const c = Ga("hidden", e.hidden);
		c && t.push(c);
		const u = Ga("tblHeader", e.isHeader);
		return u && t.push(u), e.align && t.push(`<w:jc w:val="${e.align}"/>`), t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function ts(e) {
		const t = [], n = Wa(e.conditionalStyle);
		n && t.push(n);
		const r = Ka("gridBefore", e.style?.gridBefore);
		r && t.push(r);
		const o = Ka("gridAfter", e.style?.gridAfter);
		o && t.push(o);
		const i = Va("wBefore", e.style?.widthBefore);
		i && t.push(i);
		const a = Va("wAfter", e.style?.widthAfter);
		a && t.push(a);
		const s = Va("tblCellSpacing", e.style?.cellSpacing);
		s && t.push(s);
		const l = function(e) {
			return Ja(e.style?.height, e.style?.heightRule);
		}(e);
		l && t.push(l);
		const c = Ga("cantSplit", e.style?.cantSplit);
		c && t.push(c), (e.style?.isHeader ?? e.isHeader) && t.push("<w:tblHeader/>");
		const u = Ga("hidden", e.style?.hidden);
		if (u && t.push(u), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`), e.style?.propertyRevision) {
			const n = e.style.propertyRevision;
			t.push(`<w:trPrChange ${qa(n)}>${es(n.previous)}</w:trPrChange>`);
		}
		if (e.style?.revision && "merge" !== e.style.revision.type) {
			const n = e.style.revision, r = "insert" === n.type ? "ins" : "del";
			t.push(`<w:${r} ${qa(n)}/>`);
		}
		return t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function ns(e) {
		const t = e?.borders;
		if (!t) return "";
		const n = Tr.map(([e, n]) => [e, t[n]]).filter((e) => !!e[1]).map(([e, t]) => `<w:${e} ${Ua(t)}`).join("");
		return n ? `<w:tblBorders>${n}</w:tblBorders>` : "";
	}
	function rs(e) {
		const t = [];
		if (e.style?.styleId && t.push(`<w:tblStyle w:val="${Zn(e.style.styleId)}"/>`), e.style?.tblLook) {
			const n = e.style.tblLook;
			t.push(`<w:tblLook w:firstRow="${n.firstRow ? "1" : "0"}" w:lastRow="${n.lastRow ? "1" : "0"}" w:firstColumn="${n.firstCol ? "1" : "0"}" w:lastColumn="${n.lastCol ? "1" : "0"}" w:noHBand="${n.noHBand ? "1" : "0"}" w:noVBand="${n.noVBand ? "1" : "0"}"/>`);
		}
		e.style?.altTitle && t.push(`<w:tblCaption w:val="${Zn(e.style.altTitle)}"/>`), e.style?.altDescription && t.push(`<w:tblDescription w:val="${Zn(e.style.altDescription)}"/>`);
		const n = function(e) {
			if (!e || 0 === Object.keys(e).length) return "";
			const t = (e) => {
				const t = Kn(e);
				return null === t ? void 0 : String(t);
			}, n = {
				horzAnchor: e.horizontalAnchor,
				vertAnchor: e.verticalAnchor,
				tblpX: t(e.x),
				tblpY: t(e.y),
				tblpXSpec: e.xAlign,
				tblpYSpec: e.yAlign,
				topFromText: t(e.distanceTop),
				rightFromText: t(e.distanceRight),
				bottomFromText: t(e.distanceBottom),
				leftFromText: t(e.distanceLeft)
			};
			return `<w:tblpPr ${Object.entries(n).filter((e) => void 0 !== e[1]).map(([e, t]) => `w:${e}="${Zn(t)}"`).join(" ")}/>`;
		}(e.style?.floating);
		n && t.push(n);
		const r = e.gridCols && e.gridCols.length > 0 ? e.gridCols.reduce((e, t) => e + t, 0) : void 0;
		t.push(Xa(e.style?.width ?? r)), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`);
		const o = Va("tblCellSpacing", e.style?.cellSpacing);
		o && t.push(o);
		const i = Ya(e.style?.defaultCellMargins);
		i && t.push(i);
		const a = ns(e.style);
		a && t.push(a);
		const s = Va("tblInd", e.style?.indentLeft);
		s && t.push(s), t.push(`<w:tblLayout w:type="${e.style?.layout ?? "fixed"}"/>`);
		const l = Ga("bidiVisual", e.style?.bidiVisual);
		if (l && t.push(l), e.style?.tblOverlap && t.push(`<w:tblOverlap w:val="${Zn(e.style.tblOverlap)}"/>`), e.style?.revision) {
			const n = e.style.revision, r = rs({
				...e,
				style: n.previous
			});
			t.push(`<w:tblPrChange ${qa(n)}>${r}</w:tblPrChange>`);
		}
		return `<w:tblPr>${Ba(t, Ma)}</w:tblPr>`;
	}
	function os(e, t, n) {
		if (!e && !t && !n) return "";
		const r = [];
		void 0 !== e?.width && r.push(Xa(e.width)), e?.align && r.push(`<w:jc w:val="${e.align}"/>`);
		const o = Va("tblCellSpacing", e?.cellSpacing);
		o && r.push(o);
		const i = Va("tblInd", e?.indentLeft);
		i && r.push(i);
		const a = e ? ns(e) : "";
		a && r.push(a), e?.layout && r.push(`<w:tblLayout w:type="${e.layout}"/>`);
		const s = Ya(e?.defaultCellMargins);
		if (s && r.push(s), n) r.push(n);
		else if (t) {
			const e = os(t.previous) || "<w:tblPrEx/>";
			r.push(`<w:tblPrExChange ${qa(t)}>${e}</w:tblPrExChange>`);
		}
		return r.length > 0 ? `<w:tblPrEx>${r.join("")}</w:tblPrEx>` : "";
	}
	function is(e, t) {
		const n = function(e) {
			const t = [], n = [];
			for (let r = 0; r < e.rows.length; r += 1) {
				const o = e.rows[r];
				if (o.style?.hidden) continue;
				let i = Math.max(0, Math.floor(o.style?.gridBefore ?? 0));
				for (let e = 0; e < o.cells.length; e += 1) {
					for (; t[i] > 0;) i += 1;
					const a = o.cells[e];
					if ("continue" === a.vMerge) continue;
					const s = Math.max(1, a.colSpan ?? 1), l = Math.max(1, a.rowSpan ?? 1);
					n.push({
						rowIndex: r,
						cellIndex: e,
						visualRowIndex: r,
						visualColumnIndex: i,
						rowSpan: l,
						colSpan: s,
						cell: a
					});
					for (let e = 0; e < s; e += 1) t[i + e] = Math.max(t[i + e] ?? 0, l);
					i += s;
				}
				for (let e = 0; e < t.length; e += 1) t[e] > 0 && (t[e] -= 1);
			}
			if (e.style?.bidiVisual && n.length > 0) {
				const e = Math.max(...n.map((e) => e.visualColumnIndex + e.colSpan));
				for (const t of n) t.visualColumnIndex = e - t.visualColumnIndex - t.colSpan;
			}
			return n;
		}(e), r = new Map(n.map((e) => [`${e.rowIndex}:${e.cellIndex}`, e])), o = e.rows.map((n, o) => {
			const i = n.cells.map((n, i) => {
				const a = r.get(`${o}:${i}`), s = a && e.gridCols ? e.gridCols.slice(a.visualColumnIndex, a.visualColumnIndex + Math.max(1, a.colSpan)).reduce((e, t) => e + t, 0) : void 0, l = (n.blocks.length > 0 ? n.blocks : [{
					id: "",
					type: "paragraph",
					runs: [{
						id: "",
						text: "",
						kind: "text"
					}]
				}]).map((e) => t(e, n)).join(""), c = "continue" === n.vMerge ? "<w:p/>" : l;
				return `<w:tc${ja(n.extAttributes)}>${Qa(n, s)}${c}</w:tc>`;
			}).join("");
			return `<w:tr${ja(n.extAttributes)}>${os(n.propertyExceptions, n.propertyExceptionsRevision, n.tblPrExChangeXml)}${ts(n)}${i}</w:tr>`;
		}).join(""), i = e.gridCols ? `<w:tblGrid>${e.gridCols.map((e) => `<w:gridCol w:w="${Kn(e) ?? 0}"/>`).join("")}${e.gridRevision ? `<w:tblGridChange ${qa(e.gridRevision)}><w:tblGrid>${e.gridRevision.previous.map((e) => `<w:gridCol w:w="${Kn(e) ?? 0}"/>`).join("")}</w:tblGrid></w:tblGridChange>` : ""}</w:tblGrid>` : "";
		return `<w:tbl>${rs(e)}${i}${o}</w:tbl>`;
	}
	const as = "xmlns:w15=\"http://schemas.microsoft.com/office/word/2012/wordml\"";
	function ss(e) {
		if (!(void 0 !== e.alias || void 0 !== e.tag || void 0 !== e.id || void 0 !== e.lock || void 0 !== e.appearance || void 0 !== e.showingPlcHdr || void 0 !== e.temporary || void 0 !== e.color || void 0 !== e.placeholderDocPart || void 0 !== e.dataBinding || void 0 !== e.subtype || void 0 !== e.repeatingSectionProperties || (e.unknownXml ?? "").length > 0)) return "<w:sdtPr/>";
		let t = "";
		return void 0 !== e.alias && (t += `<w:alias w:val="${Zn(e.alias)}"/>`), void 0 !== e.tag && (t += `<w:tag w:val="${Zn(e.tag)}"/>`), void 0 !== e.id && (t += `<w:id w:val="${Zn(e.id)}"/>`), void 0 !== e.lock && (t += `<w:lock w:val="${Zn(e.lock)}"/>`), void 0 !== e.placeholderDocPart && (t += `<w:placeholder><w:docPart w:val="${Zn(e.placeholderDocPart)}"/></w:placeholder>`), void 0 !== e.dataBinding && (t += function(e) {
			const t = [];
			void 0 !== e.prefixMappings && t.push(`w:prefixMappings="${Zn(e.prefixMappings)}"`);
			void 0 !== e.xpath && t.push(`w:xpath="${Zn(e.xpath)}"`);
			void 0 !== e.storeItemID && t.push(`w:storeItemID="${Zn(e.storeItemID)}"`);
			return t.length > 0 ? `<w:dataBinding ${t.join(" ")}/>` : "";
		}(e.dataBinding)), void 0 !== e.temporary && (t += `<w:temporary w:val="${e.temporary ? "true" : "false"}"/>`), void 0 !== e.subtype && (t += function(e, t) {
			switch (e.kind) {
				case "text": return "<w:text/>";
				case "richText": return "<w:richText/>";
				case "picture": return "<w:picture/>";
				case "group": return "<w:group/>";
				case "equation": return "<w:equation/>";
				case "citation": return "<w:citation/>";
				case "bibliography": return "<w:bibliography/>";
				case "repeatingSection": return function(e) {
					let t = "";
					void 0 !== e?.sectionTitle && (t += `<w15:sectionTitle w15:val="${Zn(e.sectionTitle)}"/>`);
					void 0 !== e?.doNotAllowInsertDeleteSection && (t += `<w15:doNotAllowInsertDeleteSection w15:val="${e.doNotAllowInsertDeleteSection ? "1" : "0"}"/>`);
					return t ? `<w15:repeatingSection ${as}>${t}</w15:repeatingSection>` : `<w15:repeatingSection ${as}/>`;
				}(t);
				case "repeatingSectionItem": return `<w15:repeatingSectionItem ${as}/>`;
				case "comboBox":
				case "dropDownList": {
					const t = (e.listItems ?? []).map(ls).join(""), n = void 0 !== e.lastSelectedValue ? `<w:lastSelectedValue w:val="${Zn(e.lastSelectedValue)}"/>` : "";
					return `<w:${e.kind}>${t}${n}</w:${e.kind}>`;
				}
				case "date": {
					const t = void 0 !== e.fullDate ? ` w:fullDate="${Zn(e.fullDate)}"` : "";
					let n = "";
					return void 0 !== e.dateFormat && (n += `<w:dateFormat w:val="${Zn(e.dateFormat)}"/>`), void 0 !== e.lid && (n += `<w:lid w:val="${Zn(e.lid)}"/>`), void 0 !== e.calendar && (n += `<w:calendar w:val="${Zn(e.calendar)}"/>`), void 0 !== e.storeMappedDataAs && (n += `<w:storeMappedDataAs w:val="${Zn(e.storeMappedDataAs)}"/>`), `<w:date${t}>${n}</w:date>`;
				}
				case "checkbox": {
					let t = "";
					if (void 0 !== e.checked && (t += `<w14:checked w14:val="${e.checked ? "1" : "0"}"/>`), void 0 !== e.checkedStateFont || void 0 !== e.checkedStateChar) t += `<w14:checkedState${void 0 !== e.checkedStateFont ? ` w14:font="${Zn(e.checkedStateFont)}"` : ""}${void 0 !== e.checkedStateChar ? ` w14:char="${Zn(e.checkedStateChar)}"` : ""}/>`;
					if (void 0 !== e.uncheckedStateFont || void 0 !== e.uncheckedStateChar) t += `<w14:uncheckedState${void 0 !== e.uncheckedStateFont ? ` w14:font="${Zn(e.uncheckedStateFont)}"` : ""}${void 0 !== e.uncheckedStateChar ? ` w14:char="${Zn(e.uncheckedStateChar)}"` : ""}/>`;
					return `<w14:checkbox>${t}</w14:checkbox>`;
				}
				default: return e;
			}
		}(e.subtype, e.repeatingSectionProperties)), void 0 !== e.appearance && (t += `<w:appearance w:val="${Zn(e.appearance)}"/>`), void 0 !== e.showingPlcHdr && (t += `<w:showingPlcHdr w:val="${e.showingPlcHdr ? "true" : "false"}"/>`), void 0 !== e.color && (t += `<w:color w:val="${Zn(e.color)}"/>`), e.unknownXml && (t += e.unknownXml), `<w:sdtPr>${t}</w:sdtPr>`;
	}
	function ls(e) {
		return `<w:listItem${void 0 !== e.displayText ? ` w:displayText="${Zn(e.displayText)}"` : ""}${void 0 !== e.value ? ` w:value="${Zn(e.value)}"` : ""}/>`;
	}
	function cs(e, t) {
		const n = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const o = e.childNodes[r];
			o?.nodeType === o.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && o.localName === t && n.push(o);
		}
		return n;
	}
	function us(e, t) {
		const n = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">${e}</oasis:root>`, "application/xml").documentElement;
		if (n) for (let r = 0; r < n.childNodes.length; r += 1) {
			const e = n.childNodes[r];
			if (e?.nodeType === e.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) return e;
		}
	}
	function ds(e, t) {
		const n = e.ownerDocument;
		if (!n) return null;
		const r = n.createElementNS(Wn, "w:sdt"), o = us(ss(t.sdtPr), "sdtPr");
		if (o && r.appendChild(o.cloneNode(!0)), t.sdtEndPrXml) {
			const e = us(t.sdtEndPrXml, "sdtEndPr");
			e && r.appendChild(e.cloneNode(!0));
		}
		const i = n.createElementNS(Wn, "w:sdtContent");
		return r.appendChild(i), {
			sdt: r,
			content: i
		};
	}
	function ps(e, t) {
		let n = 0;
		for (; n < t.length;) {
			const r = t[n].wrappers[0];
			if (!r) {
				n += 1;
				continue;
			}
			let o = n + 1;
			for (; o < t.length && t[o].wrappers[0]?.groupId === r.groupId;) o += 1;
			const i = ds(e, r);
			if (!i) {
				n = o;
				continue;
			}
			e.insertBefore(i.sdt, t[n].element);
			const a = [];
			for (let e = n; e < o; e += 1) {
				const n = t[e];
				i.content.appendChild(n.element), a.push({
					element: n.element,
					wrappers: n.wrappers.slice(1)
				});
			}
			ps(i.content, a), n = o;
		}
	}
	function fs(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function hs(e) {
		return `${e.namespaceURI ?? ""}\0${function(e) {
			return e.localName ?? e.tagName;
		}(e)}`;
	}
	function ms(e, t, n) {
		const r = hs(e[t]);
		let o = 0;
		for (let i = 0; i < t; i += 1) hs(e[i]) === r && (o += 1);
		return n.filter((e) => hs(e) === r)[o];
	}
	function gs(e, t) {
		(function(e, t) {
			for (let n = 0; n < e.attributes.length; n += 1) {
				const r = e.attributes[n];
				if (!r || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r.namespaceURI || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI) continue;
				const o = r.localName ?? r.name;
				(r.namespaceURI ? t.hasAttributeNS(r.namespaceURI, o) : t.hasAttribute(r.name)) || (r.namespaceURI ? t.setAttributeNS(r.namespaceURI, r.name, r.value) : t.setAttribute(r.name, r.value));
			}
		})(e, t);
		const n = fs(e), r = fs(t);
		n.forEach((e, o) => {
			const i = ms(n, o, r);
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI) return void (i && gs(e, i));
			if (i) return void gs(e, i);
			const a = n.slice(o + 1).map((e, t) => ms(n, o + t + 1, r)).find((e) => Boolean(e));
			t.insertBefore(e.cloneNode(!0), a ?? null);
		});
	}
	const ws = /* @__PURE__ */ new Set([
		"tblStyle",
		"tblpPr",
		"tblOverlap",
		"bidiVisual",
		"tblStyleRowBandSize",
		"tblStyleColBandSize",
		"tblW",
		"jc",
		"tblCellSpacing",
		"tblInd",
		"tblBorders",
		"tblLayout",
		"tblCellMar",
		"tblLook",
		"tblCaption",
		"tblDescription",
		"tblPrChange"
	]), bs = /* @__PURE__ */ new Set(["gridCol", "tblGridChange"]), vs = /* @__PURE__ */ new Set([
		"tblW",
		"jc",
		"tblCellSpacing",
		"tblInd",
		"tblBorders",
		"tblLayout",
		"tblCellMar",
		"tblPrExChange"
	]), ys = /* @__PURE__ */ new Set([
		"cnfStyle",
		"gridBefore",
		"gridAfter",
		"wBefore",
		"wAfter",
		"cantSplit",
		"trHeight",
		"tblHeader",
		"tblCellSpacing",
		"jc",
		"hidden",
		"ins",
		"del",
		"trPrChange"
	]), xs = /* @__PURE__ */ new Set([
		"cnfStyle",
		"tcW",
		"gridSpan",
		"hMerge",
		"vMerge",
		"tcBorders",
		"shd",
		"noWrap",
		"tcMar",
		"textDirection",
		"tcFitText",
		"vAlign",
		"hideMark",
		"headers",
		"cellIns",
		"cellDel",
		"cellMerge",
		"tcPrChange"
	]);
	function Ss(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function Ns(e) {
		return e.localName ?? e.tagName;
	}
	function Es(e) {
		return `${e.namespaceURI ?? ""}\0${Ns(e)}`;
	}
	function ks(e, t) {
		const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n?.namespaceURI && Ns(n) === t ? n : void 0;
	}
	function Ts(e, t, n, r, o) {
		if (!e || function(e) {
			return Boolean(e && Ti(e.xml));
		}(e)) return t;
		if (e.semanticSignature === o) return e.xml;
		const i = ks(e.xml, n), a = function(e, t) {
			if (e) {
				const n = ks(e, t);
				if (n) return n;
			}
			return new b.DOMParser().parseFromString(`<w:${t} xmlns:w="${Wn}"/>`, "application/xml").documentElement;
		}(t, n);
		if (!i || !a) return t;
		(function(e, t) {
			for (let n = 0; n < e.attributes.length; n += 1) {
				const r = e.attributes.item(n);
				if (!r || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI) continue;
				const o = r.localName ?? r.name;
				(r.namespaceURI ? t.hasAttributeNS(r.namespaceURI, o) : t.hasAttribute(r.name)) || (r.namespaceURI ? t.setAttributeNS(r.namespaceURI, r.name, r.value) : t.setAttribute(r.name, r.value));
			}
		})(i, a);
		const s = Ss(i), l = Ss(a), c = /* @__PURE__ */ new Map();
		for (const f of l) {
			const e = Es(f), t = c.get(e) ?? [];
			t.push(f), c.set(e, t);
		}
		const u = /* @__PURE__ */ new Map();
		for (const f of s) {
			const e = Es(f), t = u.get(e) ?? 0;
			u.set(e, t + 1);
			const n = c.get(e)?.[t];
			n && gs(f, n);
		}
		const d = new Set(l.map(Es)), p = s.filter((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && r.has(Ns(e)) || d.has(Es(e))));
		for (const f of p) {
			const e = s.indexOf(f), t = s.slice(e + 1).find((e) => d.has(Es(e))), n = t ? Ss(a).find((e) => Es(e) === Es(t)) ?? null : null;
			a.insertBefore(f.cloneNode(!0), n);
		}
		return t || function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const n = e.attributes.item(t);
				if (n && "http://www.w3.org/2000/xmlns/" !== n.namespaceURI) return !0;
			}
			return !1;
		}(a) || 0 !== Ss(a).length ? new b.XMLSerializer().serializeToString(a) : "";
	}
	function Is(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function _s(e, t) {
		return Is(e).filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t);
	}
	function Cs(e, t) {
		return _s(e, t)[0];
	}
	function As(e, t) {
		const n = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}">${e}</oasis:root>`, "application/xml").documentElement;
		if (n) return n ? Is(n).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) : void 0;
	}
	function Rs(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : "";
	}
	function $s(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Ds(e) {
		const t = /* @__PURE__ */ new Map();
		let n = 0;
		for (const r of e) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r.namespaceURI && ("tblPr" === r.localName || "tblGrid" === r.localName ? t.set(r, r.localName) : "tr" === r.localName && (t.set(r, `tr:${n}`), n += 1));
		return t;
	}
	function Ps(e, t, n, r, o) {
		if (!n) return void (t && e.removeChild(t));
		const i = As(n, r);
		i && (t ? e.replaceChild(i.cloneNode(!0), t) : e.insertBefore(i.cloneNode(!0), o));
	}
	function Ms(e, t) {
		const n = Cs(t, "tblPr"), r = Cs(t, "tblGrid"), o = Cs(t, "tr") ?? null;
		Ps(t, n, function(e, t) {
			return Ts(Wi(e)?.tableProperties, t, "tblPr", ws, Li(e));
		}(e, Rs(n)), "tblPr", r ?? o);
		const i = Cs(t, "tblGrid");
		Ps(t, i, function(e, t) {
			return Ts(Wi(e)?.tableGrid, t, "tblGrid", bs, Bi(e));
		}(e, Rs(i)), "tblGrid", Cs(t, "tr") ?? null);
	}
	function Fs(e, t) {
		const n = _s(t, "tr");
		n.length === e.rows.length && n.forEach((t, n) => {
			const r = e.rows[n], o = Cs(t, "tblPrEx"), i = Cs(t, "trPr"), a = Cs(t, "tc") ?? null;
			Ps(t, o, function(e, t) {
				return Ts(ji(e)?.propertyExceptions, t, "tblPrEx", vs, zi(e));
			}(r, Rs(o)), "tblPrEx", i ?? a);
			const s = Cs(t, "trPr");
			var l;
			Ps(t, s, (l = function(e, t) {
				return Ts(ji(e)?.rowProperties, t, "trPr", ys, Ui(e));
			}(r, Rs(s)), l.replace(/(<w:jc\b[^>]*\bw:val=")(?<value>start|end)("[^>]*\/?>)/g, (e, t, n, r) => `${t}${"start" === n ? "left" : "right"}${r}`)), "trPr", Cs(t, "tc") ?? null);
			const c = _s(t, "tc");
			c.length === r.cells.length && c.forEach((e, t) => {
				const n = r.cells[t], o = Cs(e, "tcPr");
				Ps(e, o, function(e, t) {
					return Ts(function(e) {
						return e.ooxmlSource;
					}(e)?.cellProperties, t, "tcPr", xs, Hi(e));
				}(n, Rs(o)), "tcPr", Cs(e, "p") ?? Cs(e, "tbl") ?? null);
			});
		});
	}
	function Os(e) {
		for (const t of _s(e, "tr")) for (const e of _s(t, "tc")) {
			for (const r of _s(e, "tbl")) Os(r);
			const t = Is(e), n = t[t.length - 1];
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n?.namespaceURI && "tbl" === n.localName) {
				const t = e.ownerDocument;
				t && e.appendChild(t.createElementNS(Wn, "w:p"));
			}
		}
	}
	function Ls(e, t) {
		const n = is(e, t), r = As(n, "tbl");
		return r ? (function(e, t) {
			const n = Wi(e)?.xml;
			if (!n) return;
			const r = As(n, "tbl");
			if (!r) return;
			(function(e, t) {
				for (let n = 0; n < e.attributes.length; n += 1) {
					const r = e.attributes.item(n);
					if (!r || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI) continue;
					const o = r.localName ?? r.name;
					(r.namespaceURI ? t.hasAttributeNS(r.namespaceURI, o) : t.hasAttribute(r.name)) || (r.namespaceURI ? t.setAttributeNS(r.namespaceURI, r.name, r.value) : t.setAttribute(r.name, r.value));
				}
			})(r, t);
			const o = Is(r), i = Is(t), a = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName), s = i.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName);
			if (a.length !== s.length) return;
			const l = Ds(o), c = new Map([...Ds(i)].map(([e, t]) => [t, e]));
			for (let u = 0; u < o.length; u += 1) {
				const e = o[u];
				if (l.has(e)) continue;
				if ($s(Rs(e))) continue;
				const n = o.slice(u + 1).map((e) => l.get(e)).find((e) => Boolean(e)), r = n ? c.get(n) ?? null : null;
				t.insertBefore(e.cloneNode(!0), r);
			}
		}(e, r), Ms(e, r), Fs(e, r), Os(r), function(e, t) {
			const n = cs(t, "tr");
			if (n.length === e.rows.length) {
				for (let t = 0; t < n.length; t += 1) {
					const r = n[t], o = e.rows[t], i = cs(r, "tc");
					i.length === o.cells.length && ps(r, i.map((e, t) => ({
						element: e,
						wrappers: o.cells[t].sdtWrappers ?? []
					})));
				}
				ps(t, n.map((t, n) => ({
					element: t,
					wrappers: e.rows[n].sdtWrappers ?? []
				})));
			}
		}(e, r), new b.XMLSerializer().serializeToString(r).replace(`<w:tbl xmlns:w="${Wn}"`, "<w:tbl")) : n;
	}
	const Bs = `xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"`;
	function Us(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function zs(e, t, n) {
		const r = e.ownerDocument;
		if (!r) return;
		const o = r.createElementNS(Wn, `w:${n}`);
		for (let i = 0; i < t.attributes.length; i += 1) {
			const e = t.attributes.item(i);
			e && (e.namespaceURI ? o.setAttributeNS(e.namespaceURI, e.name, e.value) : o.setAttribute(e.name, e.value));
		}
		for (; t.firstChild;) o.appendChild(t.firstChild);
		e.replaceChild(o, t);
	}
	function Hs(e) {
		const t = function(e) {
			const t = new b.DOMParser().parseFromString(`<oasis:root ${Bs}>${e}</oasis:root>`, "application/xml").documentElement;
			if (!t) return;
			const n = Us(t);
			if (1 !== n.length) return;
			const r = n[0];
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r.namespaceURI && "r" === r.localName ? r : void 0;
		}(e);
		if (!t) return e;
		const n = Us(t), r = n.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "t" === e.localName);
		if (r.length > 0) {
			for (const e of n) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delText" === e.localName && t.removeChild(e);
			for (const e of r) zs(t, e, "delText");
		}
		const o = Us(t), i = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "instrText" === e.localName);
		if (i.length > 0) {
			for (const e of o) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delInstrText" === e.localName && t.removeChild(e);
			for (const e of i) zs(t, e, "delInstrText");
		}
		return new b.XMLSerializer().serializeToString(t);
	}
	function js(e) {
		return /^\d+$/.test(e) ? e : String(Array.from(e).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0));
	}
	function qs(e) {
		const t = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${js(e.id)}" w:author="${Zn(e.author)}" w:date="${t}"`;
	}
	function Ws(e) {
		if (!e || 0 === e.length) return "";
		const t = e.map((e) => {
			const t = Kn(e.position);
			if (null === t) return "";
			const n = [`w:val="${e.type}"`, `w:pos="${t}"`];
			return e.leader && "none" !== e.leader ? n.push(`w:leader="${e.leader}"`) : "none" === e.leader && n.push("w:leader=\"none\""), `<w:tab ${n.join(" ")}/>`;
		}).filter(Boolean);
		return t.length > 0 ? `<w:tabs>${t.join("")}</w:tabs>` : "";
	}
	function Gs(e) {
		const t = [];
		e.framePrXml && t.push(e.framePrXml), e.suppressLineNumbers && t.push("<w:suppressLineNumbers/>"), e.suppressAutoHyphens && t.push("<w:suppressAutoHyphens/>"), e.bidi && t.push("<w:bidi/>"), !1 === e.kinsoku && t.push("<w:kinsoku w:val=\"0\"/>"), !1 === e.wordWrap && t.push("<w:wordWrap w:val=\"0\"/>"), !1 === e.overflowPunct && t.push("<w:overflowPunct w:val=\"0\"/>"), e.topLinePunct && t.push("<w:topLinePunct/>"), !1 === e.autoSpaceDE && t.push("<w:autoSpaceDE w:val=\"0\"/>"), !1 === e.autoSpaceDN && t.push("<w:autoSpaceDN w:val=\"0\"/>"), !1 === e.adjustRightInd && t.push("<w:adjustRightInd w:val=\"0\"/>"), e.textAlignment && t.push(`<w:textAlignment w:val="${e.textAlignment}"/>`), e.textboxTightWrap && t.push(`<w:textboxTightWrap w:val="${e.textboxTightWrap}"/>`), null != e.divId && t.push(`<w:divId w:val="${e.divId}"/>`);
		const n = (r = e.conditionalStyle) ? `<w:cnfStyle w:val="${kr.map(([, e]) => r[e] ? "1" : "0").join("")}"/>` : "";
		var r;
		return n && t.push(n), t;
	}
	function Vs(e) {
		const { propertyRevision: t, styleId: n, ...r } = e.previous, o = Zs(r), i = o ? o.slice(7, -8) : "", a = n ? `<w:pStyle w:val="${Zn(n)}"/>` : "";
		return `<w:pPrChange ${qs(e)}><w:pPr>${a}${i}</w:pPr></w:pPrChange>`;
	}
	function Xs(e) {
		return "justify" === e ? "both" : String(e);
	}
	function Zs(e, t) {
		const n = [];
		if (t && n.push(t), e.align && n.push(`<w:jc w:val="${Xs(e.align)}"/>`), void 0 !== e.spacingBefore || void 0 !== e.spacingAfter || void 0 !== e.lineHeight) {
			const t = [], r = Qn(e.spacingBefore), o = Qn(e.spacingAfter), i = void 0 !== e.lineHeight && null !== e.lineHeight && Number.isFinite(e.lineHeight), a = "exact" === e.lineRule || "atLeast" === e.lineRule, s = i ? a ? Yn(e.lineHeight, 0) : Math.round(240 * e.lineHeight) : null;
			null !== r && t.push(`w:before="${r}"`), null !== o && t.push(`w:after="${o}"`), null !== s && t.push(`w:line="${s}"`), null !== s && a && t.push(`w:lineRule="${e.lineRule}"`), t.length > 0 && n.push(`<w:spacing ${t.join(" ")}/>`);
		}
		if (void 0 !== e.indentLeft || void 0 !== e.indentRight || void 0 !== e.indentFirstLine || void 0 !== e.indentHanging) {
			const t = [], r = Qn(e.indentLeft), o = Qn(e.indentRight), i = Qn(e.indentFirstLine), a = Qn(e.indentHanging);
			null !== r && t.push(`w:left="${r}"`), null !== o && t.push(`w:right="${o}"`), null !== i && t.push(`w:firstLine="${i}"`), null !== a && t.push(`w:hanging="${a}"`), t.length > 0 && n.push(`<w:ind ${t.join(" ")}/>`);
		}
		const r = Ws(e.tabs);
		r && n.push(r), e.pageBreakBefore && n.push("<w:pageBreakBefore/>"), e.keepWithNext && n.push("<w:keepNext/>"), e.keepLinesTogether && n.push("<w:keepLines/>"), !1 === e.widowControl && n.push("<w:widowControl w:val=\"0\"/>"), e.contextualSpacing && n.push("<w:contextualSpacing/>"), e.mirrorIndents && n.push("<w:mirrorIndents/>");
		const o = za(e);
		return o && n.push(o), e.shading && n.push(er(e.shading)), e.textDirection && n.push(`<w:textDirection w:val="${e.textDirection}"/>`), null != e.outlineLevel && n.push(`<w:outlineLvl w:val="${e.outlineLevel}"/>`), n.push(...Gs(e)), e.propertyRevision && n.push(Vs(e.propertyRevision)), n.length > 0 ? `<w:pPr>${Ba(n, Da)}</w:pPr>` : "";
	}
	function Ys(e, t, n, r) {
		const o = [], i = function(e, t) {
			const n = De(e.style, t);
			return {
				align: n.align,
				spacingBefore: n.spacingBefore,
				spacingAfter: n.spacingAfter,
				contextualSpacing: n.contextualSpacing,
				lineHeight: n.lineHeight,
				lineRule: n.lineRule,
				indentLeft: n.indentLeft,
				indentRight: n.indentRight,
				indentFirstLine: n.indentFirstLine,
				indentHanging: n.indentHanging,
				mirrorIndents: n.mirrorIndents,
				pageBreakBefore: n.pageBreakBefore,
				keepWithNext: n.keepWithNext,
				keepLinesTogether: n.keepLinesTogether,
				widowControl: n.widowControl,
				shading: n.shading,
				borderTop: n.borderTop,
				borderRight: n.borderRight,
				borderBottom: n.borderBottom,
				borderLeft: n.borderLeft,
				tabs: n.tabs,
				textDirection: n.textDirection,
				outlineLevel: n.outlineLevel,
				suppressLineNumbers: n.suppressLineNumbers,
				suppressAutoHyphens: n.suppressAutoHyphens,
				bidi: n.bidi,
				kinsoku: n.kinsoku,
				wordWrap: n.wordWrap,
				overflowPunct: n.overflowPunct,
				topLinePunct: n.topLinePunct,
				autoSpaceDE: n.autoSpaceDE,
				autoSpaceDN: n.autoSpaceDN,
				adjustRightInd: n.adjustRightInd,
				textAlignment: n.textAlignment,
				textboxTightWrap: n.textboxTightWrap,
				divId: n.divId,
				conditionalStyle: n.conditionalStyle,
				borderBetween: n.borderBetween,
				borderBar: n.borderBar,
				framePrXml: n.framePrXml,
				propertyRevision: e.style?.propertyRevision
			};
		}(e, n), a = e.style?.align ?? r?.align ?? i.align;
		if (e.style?.styleId && o.push(`<w:pStyle w:val="${Zn(e.style.styleId)}"/>`), a && o.push(`<w:jc w:val="${Xs(a)}"/>`), void 0 !== i.spacingBefore || void 0 !== i.spacingAfter || void 0 !== i.lineHeight) {
			const e = [], t = Qn(i.spacingBefore), n = Qn(i.spacingAfter), r = void 0 !== i.lineHeight && null !== i.lineHeight && Number.isFinite(i.lineHeight), a = "exact" === i.lineRule || "atLeast" === i.lineRule, s = r ? a ? Yn(i.lineHeight, 0) : Math.round(240 * i.lineHeight) : null;
			null !== t && e.push(`w:before="${t}"`), null !== n && e.push(`w:after="${n}"`), null !== s && e.push(`w:line="${s}"`), null !== s && a && e.push(`w:lineRule="${i.lineRule}"`), e.length > 0 && o.push(`<w:spacing ${e.join(" ")}/>`);
		}
		if (void 0 !== i.indentLeft || void 0 !== i.indentRight || void 0 !== i.indentFirstLine || void 0 !== i.indentHanging) {
			const e = [], t = Qn(i.indentLeft), n = Qn(i.indentRight), r = Qn(i.indentFirstLine), a = Qn(i.indentHanging);
			null !== t && e.push(`w:left="${t}"`), null !== n && e.push(`w:right="${n}"`), null !== r && e.push(`w:firstLine="${r}"`), null !== a && e.push(`w:hanging="${a}"`), e.length > 0 && o.push(`<w:ind ${e.join(" ")}/>`);
		}
		const s = Ws(i.tabs);
		s && o.push(s), i.pageBreakBefore && o.push("<w:pageBreakBefore/>"), i.keepWithNext && o.push("<w:keepNext/>"), i.keepLinesTogether && o.push("<w:keepLines/>"), !1 === i.widowControl && o.push("<w:widowControl w:val=\"0\"/>"), i.contextualSpacing && o.push("<w:contextualSpacing/>"), i.mirrorIndents && o.push("<w:mirrorIndents/>");
		const l = za(i);
		l && o.push(l), i.shading && o.push(er(i.shading)), i.textDirection && o.push(`<w:textDirection w:val="${i.textDirection}"/>`), null != i.outlineLevel && o.push(`<w:outlineLvl w:val="${i.outlineLevel}"/>`), o.push(...Gs(i));
		const c = t.get(e.id), u = e.numberingRevision ? `<w:numberingChange ${qs(e.numberingRevision)}${void 0 !== e.numberingRevision.original ? ` w:original="${Zn(e.numberingRevision.original)}"` : ""}/>` : "";
		if (c || u) {
			const e = c ? `<w:ilvl w:val="${c.level}"/><w:numId w:val="${c.numId}"/>` : "";
			o.push(`<w:numPr>${e}${u}</w:numPr>`);
		}
		return e.style?.propertyRevision && o.push(Vs(e.style.propertyRevision)), o.length > 0 ? `<w:pPr>${Ba(o, Da)}</w:pPr>` : "";
	}
	function Qs(e) {
		let t = e.trim();
		for (let n = 0; n < 3; n++) {
			const e = /^(?:"([^"]*)"|'([^']*)'|([^,]*))/.exec(t);
			if (!e) break;
			const n = (e[1] ?? e[2] ?? e[3] ?? "").trim();
			if (!/,\s*(?:sans-serif|serif|monospace|system-ui)\s*$/i.test(n)) return {
				"sans-serif": "Calibri",
				serif: "Times New Roman",
				monospace: "Courier New",
				"system-ui": "Calibri"
			}[n.toLowerCase()] ?? (n && n.length <= 31 ? n : "Calibri");
			t = n;
		}
		return "Calibri";
	}
	const Ks = {
		black: [
			0,
			0,
			0
		],
		blue: [
			0,
			0,
			255
		],
		cyan: [
			0,
			255,
			255
		],
		green: [
			0,
			128,
			0
		],
		magenta: [
			255,
			0,
			255
		],
		red: [
			255,
			0,
			0
		],
		yellow: [
			255,
			255,
			0
		],
		white: [
			255,
			255,
			255
		],
		darkBlue: [
			0,
			0,
			139
		],
		darkCyan: [
			0,
			139,
			139
		],
		darkGreen: [
			0,
			100,
			0
		],
		darkMagenta: [
			139,
			0,
			139
		],
		darkRed: [
			139,
			0,
			0
		],
		darkYellow: [
			184,
			134,
			11
		],
		darkGray: [
			169,
			169,
			169
		],
		lightGray: [
			211,
			211,
			211
		]
	}, Js = {
		ffff00: "yellow",
		fef08a: "yellow",
		ff0000: "red",
		"00ff00": "green",
		"0000ff": "blue",
		"00ffff": "cyan",
		ff00ff: "magenta",
		"000000": "black",
		ffffff: "white"
	}, el = "http://schemas.openxmlformats.org/markup-compatibility/2006";
	function tl(e) {
		return `<w14:solidFill><w14:srgbClr w14:val="${Jn(e)}"/></w14:solidFill>`;
	}
	function nl(e) {
		return "solid" === e.type ? tl(e.color) : `<w14:gradFill><w14:gsLst>${e.stops.map((e) => {
			const t = Jn(e.color);
			return `<w14:gs w14:pos="${Math.round(e.position * ie)}"><w14:srgbClr w14:val="${t}">${void 0 !== e.alpha ? `<w14:alpha w14:val="${Math.round(e.alpha * ie)}"/>` : ""}</w14:srgbClr></w14:gs>`;
		}).join("")}</w14:gsLst><w14:lin w14:ang="${Math.round((e.angle ?? 0) * ae)}" w14:scaled="0"/></w14:gradFill>`;
	}
	function rl(e, t) {
		return `<w14:srgbClr w14:val="${Jn(e)}">${void 0 !== t ? `<w14:alpha w14:val="${Math.round(t * ie)}"/>` : ""}</w14:srgbClr>`;
	}
	function ol(e) {
		return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14">${e}</mc:Choice><mc:Fallback/></mc:AlternateContent>`;
	}
	function il(e) {
		return null != e && Number.isFinite(e) ? Math.round(20 * e) : null;
	}
	const al = function(e) {
		if (!e) return null;
		const t = Hn(e);
		return zn.test(t) ? [
			Number.parseInt(t.slice(0, 2), 16),
			Number.parseInt(t.slice(2, 4), 16),
			Number.parseInt(t.slice(4, 6), 16)
		] : null;
	};
	function sl(e) {
		if (!e) return "";
		const t = [];
		e.styleId && t.push(`<w:rStyle w:val="${Zn(e.styleId)}"/>`);
		const n = (e, ...n) => {
			if (null != e) for (const r of n) t.push(e ? `<w:${r}/>` : `<w:${r} w:val="0"/>`);
		};
		if (n(e.bold, "b", "bCs"), n(e.italic, "i", "iCs"), e.underline) {
			const n = e.underlineStyle ?? "single", r = e.underlineColor ? ` w:color="${Jn(e.underlineColor, "auto")}"` : "";
			t.push(`<w:u w:val="${Zn(n)}"${r}/>`);
		} else !1 === e.underline && t.push("<w:u w:val=\"none\"/>");
		if (n(e.strike, "strike"), n(e.doubleStrike, "dstrike"), n(e.outline, "outline"), n(e.shadow, "shadow"), n(e.emboss, "emboss"), n(e.imprint, "imprint"), n(e.smallCaps, "smallCaps"), n(e.allCaps, "caps"), n(e.hidden, "vanish"), n(e.noProof, "noProof"), n(e.webHidden, "webHidden"), n(e.specVanish, "specVanish"), !1 === e.snapToGrid && t.push("<w:snapToGrid w:val=\"0\"/>"), e.textEffect && t.push(`<w:effect w:val="${Zn(e.textEffect)}"/>`), e.textBorder && t.push(`<w:bdr ${Ua(e.textBorder)}`), void 0 !== e.characterScale && null !== e.characterScale && Number.isFinite(e.characterScale) && t.push(`<w:w w:val="${Math.max(1, Math.round(e.characterScale))}"/>`), void 0 !== e.characterSpacing && null !== e.characterSpacing) {
			const n = il(e.characterSpacing);
			null !== n && t.push(`<w:spacing w:val="${n}"/>`);
		}
		void 0 !== e.baselineShift && null !== e.baselineShift && Number.isFinite(e.baselineShift) && t.push(`<w:position w:val="${Math.round(2 * e.baselineShift)}"/>`), void 0 !== e.kerningThreshold && null !== e.kerningThreshold && Number.isFinite(e.kerningThreshold) && t.push(`<w:kern w:val="${Math.max(0, Math.round(2 * e.kerningThreshold))}"/>`);
		const r = function(e) {
			switch (e) {
				case "none": return "none";
				case "standard": return "standard";
				case "contextual": return "contextual";
				case "historical": return "historical";
				case "standardContextual": return "standardContextual";
				default: return null;
			}
		}(e.ligatures);
		r && t.push(`<w14:ligatures w14:val="${r}"/>`);
		const o = function(e) {
			switch (e) {
				case "proportional": return "proportional";
				case "tabular": return "tabular";
				default: return null;
			}
		}(e.numberSpacing);
		o && t.push(`<w14:numSpacing w14:val="${o}"/>`);
		const i = function(e) {
			switch (e) {
				case "lining": return "lining";
				case "oldStyle": return "oldStyle";
				default: return null;
			}
		}(e.numberForm);
		i && t.push(`<w14:numForm w14:val="${i}"/>`);
		const a = function(e) {
			return "number" != typeof e || e < 1 || e > 20 ? null : (1 << e - 1).toString(16).toUpperCase().padStart(8, "0");
		}(e.stylisticSet);
		if (a && t.push(`<w14:stylisticSets w14:val="${a}"/>`), void 0 !== e.contextualAlternates && t.push(`<w14:cntxtAlts w14:val="${e.contextualAlternates ? 1 : 0}"/>`), e.superscript ? t.push("<w:vertAlign w:val=\"superscript\"/>") : e.subscript ? t.push("<w:vertAlign w:val=\"subscript\"/>") : !1 !== e.superscript && !1 !== e.subscript || t.push("<w:vertAlign w:val=\"baseline\"/>"), e.fontFamily && t.push(`<w:rFonts w:ascii="${Zn(Qs(e.fontFamily))}" w:hAnsi="${Zn(Qs(e.fontFamily))}" w:cs="${Zn(Qs(e.fontFamily))}"/>`), void 0 !== e.fontSize && null !== e.fontSize) {
			const n = function(e) {
				return null != e && Number.isFinite(e) ? Math.round(e / 96 * 72 * 2) : null;
			}(e.fontSize);
			null !== n && t.push(`<w:sz w:val="${n}"/>`, `<w:szCs w:val="${n}"/>`);
		}
		if (e.textFill) {
			const n = "solid" === e.textFill.type ? e.textFill.color : e.color;
			t.push(function(e, t) {
				const n = nl(e), r = Jn(t ?? "000000");
				return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14"><w14:textFill>${n}</w14:textFill></mc:Choice><mc:Fallback><w:color w:val="${r}"/></mc:Fallback></mc:AlternateContent>`;
			}(e.textFill, n ?? null));
		} else e.color && t.push(`<w:color w:val="${Jn(e.color, "auto")}"/>`);
		if (e.textOutline && t.push(function(e) {
			const t = Math.round(Math.max(0, e.widthPt) * re), n = e.fill ? nl(e.fill) : e.color ? tl(e.color) : "";
			return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14"><w14:textOutline w14:w="${t}" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">` + n + "</w14:textOutline></mc:Choice><mc:Fallback><w:outline/></mc:Fallback></mc:AlternateContent>";
		}(e.textOutline)), e.textShadow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * re), n = Math.round(Math.max(0, e.distPt) * re), r = Math.round(e.dirDeg * ae), o = rl(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14"><w14:shadow w14:blurRad="${t}" w14:dist="${n}" w14:dir="${r}" w14:sx="100000" w14:sy="100000" w14:kx="0" w14:ky="0" w14:algn="ctr">` + o + "</w14:shadow></mc:Choice><mc:Fallback><w:shadow/></mc:Fallback></mc:AlternateContent>";
		}(e.textShadow)), e.glow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.radiusPt) * re), n = rl(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14"><w14:glow w14:rad="${t}">${n}</w14:glow></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.glow)), e.reflection && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * re), n = Math.round(e.startAlpha * ie), r = Math.round(e.startPos * ie), o = Math.round(e.endAlpha * ie), i = Math.round(e.endPos * ie), a = Math.round(Math.max(0, e.distPt) * re);
			return `<mc:AlternateContent xmlns:mc="${el}"><mc:Choice Requires="w14"><w14:reflection w14:blurRad="${t}" w14:stA="${n}" w14:stPos="${r}" w14:endA="${o}" w14:endPos="${i}" w14:dist="${a}" w14:dir="5400000" w14:fadeDir="5400000" w14:sx="100000" w14:sy="-100000" w14:kx="0" w14:ky="0" w14:algn="bl"/></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.reflection)), e.scene3dXml && t.push(ol(e.scene3dXml)), e.props3dXml && t.push(ol(e.props3dXml)), e.highlight && t.push(`<w:highlight w:val="${Zn(function(e) {
			if (e in Ks) return e;
			const t = (qn(e) ?? e).trim().replace(/^#/, "").toLowerCase(), n = Js[t];
			if (n) return n;
			const r = al(t);
			if (!r) return "yellow";
			let o = "yellow", i = Number.POSITIVE_INFINITY;
			for (const [a, s] of Object.entries(Ks)) {
				const e = (s[0] - r[0]) ** 2 + (s[1] - r[1]) ** 2 + (s[2] - r[2]) ** 2;
				e < i && (i = e, o = a);
			}
			return o;
		}(e.highlight))}"/>`), e.shading && t.push(er(e.shading)), void 0 !== e.fitText && null !== e.fitText && Number.isFinite(e.fitText)) {
			const n = il(e.fitText);
			null !== n && n > 0 && t.push(`<w:fitText w:val="${n}"/>`);
		}
		if (n(e.rtl, "rtl"), n(e.complexScript, "cs"), e.emphasisMark && t.push(`<w:em w:val="${Zn(e.emphasisMark)}"/>`), e.language) {
			const n = [];
			e.language.value && n.push(`w:val="${Zn(e.language.value)}"`), e.language.eastAsia && n.push(`w:eastAsia="${Zn(e.language.eastAsia)}"`), e.language.bidi && n.push(`w:bidi="${Zn(e.language.bidi)}"`), n.length > 0 && t.push(`<w:lang ${n.join(" ")}/>`);
		}
		return e.propertyRevision && t.push(function(e) {
			const { propertyRevision: t, styleId: n, ...r } = e.previous, o = sl(r), i = o ? o.slice(7, -8) : "", a = n ? `<w:rStyle w:val="${Zn(n)}"/>` : "";
			return `<w:rPrChange ${qs(e)}><w:rPr>${a}${i}</w:rPr></w:rPrChange>`;
		}(e.propertyRevision)), t.length > 0 ? `<w:rPr>${Ba(t, Pa)}</w:rPr>` : "";
	}
	function ll(e) {
		return 0 === e.length ? "" : `<w:t${t = e, /^\s|\s$/.test(t) || t.includes("  ") ? " xml:space=\"preserve\"" : ""}>${Zn(e)}</w:t>`;
		var t;
	}
	function cl(e) {
		if (0 === e.length) return "<w:t></w:t>";
		let t = "", n = "";
		for (const r of e) "\n" !== r ? "\v" !== r ? "	" !== r ? "‑" !== r ? "­" !== r ? n += r : (t += ll(n), n = "", t += "<w:softHyphen/>") : (t += ll(n), n = "", t += "<w:noBreakHyphen/>") : (t += ll(n), n = "", t += "<w:tab/>") : (t += ll(n), n = "", t += "<w:br w:type=\"column\"/>") : (t += ll(n), n = "", t += "<w:br/>");
		return t += ll(n), t || "<w:t></w:t>";
	}
	function ul(e, t) {
		return e ?? t ? "1" : "0";
	}
	function dl(e, t, n) {
		const r = Zn(t?.relativeFrom ?? n);
		return t?.align ? `<wp:${e} relativeFrom="${r}"><wp:align>${Zn(t.align)}</wp:align></wp:${e}>` : `<wp:${e} relativeFrom="${r}"><wp:posOffset>${t?.offset ?? 0}</wp:posOffset></wp:${e}>`;
	}
	function pl(e) {
		if (!e || e.length < 3) return "";
		const t = (e) => Math.round(21600 * Math.min(1, Math.max(0, e))), n = (e, n) => `<wp:${n} x="${t(e.x)}" y="${t(e.y)}"/>`, r = e[0];
		return `<wp:wrapPolygon edited="0">${[
			n(r, "start"),
			...e.slice(1).map((e) => n(e, "lineTo")),
			n(r, "lineTo")
		].join("")}</wp:wrapPolygon>`;
	}
	function fl(e) {
		const { cx: t, cy: n, floating: r, docPrId: o, docPrName: i, altAttr: a, graphicXml: s } = e, l = Zn(i);
		if (!r) return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${t}" cy="${n}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:inline></w:drawing>`;
		const c = r.distT ?? 0, u = r.distB ?? 0, d = r.distL ?? 0, p = r.distR ?? 0, f = dl("positionH", r.positionH, "column"), h = dl("positionV", r.positionV, "paragraph"), m = function(e, t, n) {
			const r = t && "bothSides" !== t ? ` wrapText="${t}"` : "";
			switch (e) {
				case "square": return `<wp:wrapSquare${r}/>`;
				case "tight": {
					const e = pl(n);
					return e ? `<wp:wrapTight${r}>${e}</wp:wrapTight>` : `<wp:wrapTight${r}/>`;
				}
				case "through": {
					const e = pl(n);
					return e ? `<wp:wrapThrough${r}>${e}</wp:wrapThrough>` : `<wp:wrapThrough${r}/>`;
				}
				case "topAndBottom": return "<wp:wrapTopAndBottom/>";
				default: return "<wp:wrapNone/>";
			}
		}(r.wrap, r.wrapText, e.wrapPolygon);
		return `<w:drawing><wp:anchor distT="${c}" distB="${u}" distL="${d}" distR="${p}" simplePos="${ul(r.simplePos, !1)}" relativeHeight="${r.relativeHeight ?? 0}" behindDoc="${ul(r.behindDoc, !1)}" locked="${ul(r.locked, !1)}" layoutInCell="${ul(r.layoutInCell, !0)}" allowOverlap="${ul(r.allowOverlap, !0)}"><wp:simplePos x="0" y="0"/>${f}${h}<wp:extent cx="${t}" cy="${n}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${m}<wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:anchor></w:drawing>`;
	}
	function hl(e, t, n, r) {
		const o = n.images.find((e) => e.rId === t);
		if (!o) return null;
		const i = (parseInt(t.replace(/\D+/g, ""), 10) || 0) + 1, a = void 0 !== o.alt ? ` descr="${Zn(o.alt)}" title="${Zn(o.alt)}"` : "", s = function(e) {
			let t = "";
			if (e.rotation) {
				const n = Math.round(e.rotation * ae);
				0 !== n && (t += ` rot="${n}"`);
			}
			return e.flipH && (t += " flipH=\"1\""), e.flipV && (t += " flipV=\"1\""), t;
		}(o), l = function(e) {
			if (!e) return "";
			const t = (e) => e ? Math.round(e * ie) : 0, n = t(e.left), r = t(e.top), o = t(e.right), i = t(e.bottom);
			return 0 === n && 0 === r && 0 === o && 0 === i ? "" : `<a:srcRect l="${n}" t="${r}" r="${o}" b="${i}"/>`;
		}(o.crop), c = (u = o.border) ? `<a:ln${void 0 !== u.widthPt ? ` w="${Math.round(u.widthPt * re)}"` : ""}><a:solidFill><a:srgbClr val="${Zn(u.color.replace(/^#/, ""))}"/></a:solidFill>${u.dash ? `<a:prstDash val="${u.dash}"/>` : ""}</a:ln>` : "";
		var u;
		const d = "tile" === o.fillMode ? "<a:tile/>" : "<a:stretch><a:fillRect/></a:stretch>", p = "linked" === o.kind ? `r:link="${t}"` : `r:embed="${t}"`, f = void 0 !== o.transparency && o.transparency > 0 ? `<a:alphaModFix amt="${Math.round((1 - Math.max(0, Math.min(1, o.transparency))) * ie)}"/>` : "", h = function(e) {
			if (!e) return "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>";
			if (e.rawXml && !e.adjustments) return e.rawXml;
			const t = Object.entries(e.adjustments ?? {}).map(([e, t]) => `<a:gd name="${Zn(e)}" fmla="val ${Number.isFinite(t) ? t : 0}"/>`).join(""), n = t ? `<a:avLst>${t}</a:avLst>` : "<a:avLst/>";
			return `<a:prstGeom prst="${Zn(e.preset)}">${n}</a:prstGeom>`;
		}(o.cropShape);
		return `<w:r>${r}${function(e, t, n, r) {
			return fl({
				cx: e.cx,
				cy: e.cy,
				floating: e.floating,
				docPrId: t,
				docPrName: "Picture",
				altAttr: n,
				graphicXml: r,
				wrapPolygon: e.wrapPolygon
			});
		}(o, i, a, `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${a}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip ${p} xmlns:r="${Vn}">${f}</a:blip>${l}${d}</pic:blipFill><pic:spPr><a:xfrm${s}><a:off x="0" y="0"/><a:ext cx="${o.cx}" cy="${o.cy}"/></a:xfrm>${h}${c}</pic:spPr></pic:pic></a:graphicData></a:graphic>`)}</w:r>`;
	}
	function ml(e, t, n, r, o, i) {
		const a = Math.round(t.width * ne), s = Math.round(t.height * ne), l = n.textBoxDocPrIds.get(e.id) ?? 1, c = t.name ?? "Text Box", u = void 0 !== t.alt ? ` descr="${Zn(t.alt)}" title="${Zn(t.alt)}"` : "", d = function(e, t, n, r, o, i) {
			const a = e.shape, s = Zn(a?.preset ?? "rect"), l = e.rotation ? Math.round(e.rotation * ae) : 0, c = 0 !== l ? ` rot="${l}"` : "", u = a?.fill ? `<a:solidFill><a:srgbClr val="${Zn(a.fill.replace(/^#/, ""))}"/></a:solidFill>` : "";
			let d = "";
			(a?.borderColor || void 0 !== a?.borderWidthPt) && (d = `<a:ln${void 0 !== a?.borderWidthPt ? ` w="${Math.round(a.borderWidthPt * re)}"` : ""}>${a?.borderColor ? `<a:solidFill><a:srgbClr val="${Zn(a.borderColor.replace(/^#/, ""))}"/></a:solidFill>` : ""}<a:miter lim="800000"/></a:ln>`);
			const p = e.body, f = ["rot=\"0\"", `vert="${Zn(p?.vert ?? "horz")}"`];
			f.push(`wrap="${Zn(p?.wrap ?? "square")}"`), void 0 !== p?.paddingLeft && f.push(`lIns="${Math.round(p.paddingLeft * ne)}"`), void 0 !== p?.paddingTop && f.push(`tIns="${Math.round(p.paddingTop * ne)}"`), void 0 !== p?.paddingRight && f.push(`rIns="${Math.round(p.paddingRight * ne)}"`), void 0 !== p?.paddingBottom && f.push(`bIns="${Math.round(p.paddingBottom * ne)}"`), f.push(`anchor="${Zn(p?.anchor ?? "t")}"`), f.push("anchorCtr=\"0\"");
			const h = p?.autoFit ? "<a:spAutoFit/>" : "", m = e.blocks.length > 0, g = m ? i(e.blocks, r, o) : "";
			return "<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\"><wps:wsp>" + (m ? "<wps:cNvSpPr txBox=\"1\"><a:spLocks noChangeArrowheads=\"1\"/></wps:cNvSpPr>" : "<wps:cNvSpPr/>") + `<wps:spPr bwMode="auto"><a:xfrm${c}><a:off x="0" y="0"/><a:ext cx="${t}" cy="${n}"/></a:xfrm><a:prstGeom prst="${s}"><a:avLst/></a:prstGeom>` + u + d + "</wps:spPr>" + (m ? `<wps:txbx><w:txbxContent>${g}</w:txbxContent></wps:txbx>` : "") + `<wps:bodyPr ${f.join(" ")}>${h}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
		}(t, a, s, n, r, i);
		return `<w:r>${o}${fl({
			cx: a,
			cy: s,
			floating: t.floating,
			docPrId: l,
			docPrName: c,
			altAttr: u,
			graphicXml: d
		})}</w:r>`;
	}
	function gl(e, t, n = "1") {
		let r;
		if ("DATE" === e.type) r = ` DATE \\@ "${e.dateFormat ?? "M/d/yyyy"}" `;
		else if ("REF" === e.type || "PAGEREF" === e.type) {
			const t = e.bookmark ?? "", n = /\s/.test(t) ? `"${t}"` : t;
			r = ` ${e.type} ${n} \\h `;
		} else {
			const t = "PAGE" === e.type ? " PAGE " : " NUMPAGES ", n = (o = e.format) ? function(e) {
				switch (e) {
					case "lowerRoman": return "roman";
					case "upperRoman": return "ROMAN";
					case "lowerLetter": return "alphabetic";
					case "upperLetter": return "ALPHABETIC";
					case "ordinal": return "Ordinal";
					default: return;
				}
			}(ko[o]) : void 0;
			r = n ? ` ${t.trim()} \\* ${n} ` : t;
		}
		var o;
		return `<w:fldSimple w:instr="${Zn(r)}"><w:r>${t}<w:t xml:space="preserve">${Zn(n)}</w:t></w:r></w:fldSimple>`;
	}
	function wl(e, t) {
		const n = (e.fieldLock ? " w:fldLock=\"true\"" : "") + (e.dirty ? " w:dirty=\"true\"" : ""), r = e.formField ? `>${function(e) {
			let t = zo("name", e.name) + Uo("enabled", e.enabled) + Uo("calcOnExit", e.calcOnExit);
			if ("text" === e.control) {
				const n = e.textInput ?? {};
				t += `<w:textInput${n.format ? ` w:format="${Zn(n.format)}"` : ""}${n.type ? ` w:type="${Zn(n.type)}"` : ""}` + (void 0 !== n.maxLength ? ` w:maxLength="${n.maxLength}"` : "") + ">" + (void 0 !== n.default ? zo("default", n.default) : "") + "</w:textInput>";
			} else if ("checkBox" === e.control) {
				const n = e.checkBox ?? {
					checked: !1,
					default: !1
				};
				t += "<w:checkBox" + (void 0 !== n.size ? ` w:size="${n.size}"` : "") + (n.sizeAuto ? " w:sizeAuto=\"true\"" : "") + ">" + Uo("checked", n.checked) + Uo("default", n.default) + "</w:checkBox>";
			} else {
				const n = e.ddList ?? { listEntries: [] };
				t += "<w:ddList>" + n.listEntries.map((e) => zo("listEntry", e)).join("") + (void 0 !== n.defaultResult ? zo("defaultResult", n.defaultResult) : "") + "</w:ddList>";
			}
			return void 0 !== e.helpText && (t += zo("helpText", e.helpText)), void 0 !== e.statusText && (t += zo("statusText", e.statusText)), void 0 !== e.entryMacro && (t += `<w:entryMacro>${Zn(e.entryMacro)}</w:entryMacro>`), void 0 !== e.exitMacro && (t += `<w:exitMacro>${Zn(e.exitMacro)}</w:exitMacro>`), `<w:ffData>${t}</w:ffData>`;
		}(e.formField)}</w:fldChar>` : "/>";
		return `<w:r>${t}<w:fldChar w:fldCharType="${e.kind}"${n}${r}</w:r>`;
	}
	const bl = {
		footnote: "FootnoteReference",
		endnote: "EndnoteReference"
	};
	function vl(e) {
		return `<w:r><w:rPr><w:rStyle w:val="${bl[e]}"/><w:vertAlign w:val="superscript"/></w:rPr><w:${e}Ref/></w:r>`;
	}
	function yl(e, t, n, r) {
		if (!t) return null;
		const o = ("footnote" === e ? r.footnoteIdMap : r.endnoteIdMap)?.get(t.noteId);
		if (void 0 === o) return null;
		const i = {
			...n ?? {},
			styleId: bl[e],
			superscript: !0
		}, a = t.customMark ? " w:customMarkFollows=\"1\"" : "", s = t.customMark ? `<w:t xml:space="preserve">${Zn(t.customMark)}</w:t>` : "";
		return `<w:r>${sl(i)}<w:${e}Reference${a} w:id="${o}"/>${s}</w:r>`;
	}
	function xl(e, t) {
		return void 0 === t ? "" : ` m:${e}="${Zn(String(t))}"`;
	}
	function Sl(e) {
		return e.map(Nl).join("");
	}
	function Nl(e) {
		switch (e.kind) {
			case "text": return function(e) {
				const t = e.style;
				return `<m:r>${t ? `<m:rPr>${t.bold ? "<m:b/>" : ""}${t.italic ? "<m:i/>" : ""}${t.normalText ? "<m:nor/>" : ""}${t.script ? `<m:sty m:val="${Zn(t.script)}"/>` : ""}</m:rPr>` : ""}<m:t xml:space="preserve">${Zn(e.value)}</m:t></m:r>`;
			}(e);
			case "fraction": return `<m:f>${!1 === e.bar ? "<m:fPr><m:type m:val=\"noBar\"/></m:fPr>" : ""}<m:num>${Sl(e.numerator)}</m:num><m:den>${Sl(e.denominator)}</m:den></m:f>`;
			case "radical": return e.degree ? `<m:rad><m:deg>${Sl(e.degree)}</m:deg><m:e>${Sl(e.radicand)}</m:e></m:rad>` : `<m:rad><m:e>${Sl(e.radicand)}</m:e></m:rad>`;
			case "script": {
				const t = e.subscript && e.superscript ? "sSubSup" : e.subscript ? "sSub" : "sSup";
				return `<m:${t}><m:e>${Sl(e.base)}</m:e>${e.subscript ? `<m:sub>${Sl(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${Sl(e.superscript)}</m:sup>` : ""}</m:${t}>`;
			}
			case "delimiter": return `<m:d><m:dPr>${xl("begChr", e.begin)}${xl("endChr", e.end)}${xl("sepChr", e.separator)}${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:dPr>${e.children.map((e) => `<m:e>${Sl(e)}</m:e>`).join("")}</m:d>`;
			case "accent": return `<m:acc><m:accPr><m:chr${xl("val", e.accent)}/></m:accPr><m:e>${Sl(e.children)}</m:e></m:acc>`;
			case "nary": return `<m:nary><m:naryPr><m:chr${xl("val", e.operator)}/>${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:naryPr>${e.subscript ? `<m:sub>${Sl(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${Sl(e.superscript)}</m:sup>` : ""}<m:e>${Sl(e.children)}</m:e></m:nary>`;
			case "limit": return "low" === e.operator ? `<m:limLow><m:e>${Sl(e.base)}</m:e><m:lim>${Sl(e.limit)}</m:lim></m:limLow>` : `<m:limUpp><m:e>${Sl(e.base)}</m:e><m:lim>${Sl(e.limit)}</m:lim></m:limUpp>`;
			case "matrix": return `<m:m>${e.rows.map((e) => `<m:mr>${e.map((e) => `<m:e>${Sl(e)}</m:e>`).join("")}</m:mr>`).join("")}</m:m>`;
			case "box": return `<m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}><m:e>${Sl(e.children)}</m:e></m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}>`;
			case "group": return Sl(e.children);
			case "raw": return e.xml;
		}
	}
	const El = "http://schemas.openxmlformats.org/markup-compatibility/2006", kl = /* @__PURE__ */ new Set([
		"t",
		"tab",
		"br",
		"cr",
		"noBreakHyphen",
		"softHyphen"
	]), Tl = /* @__PURE__ */ new Set([
		...kl,
		"drawing",
		"pict",
		"sym",
		"fldChar",
		"instrText",
		"footnoteReference",
		"endnoteReference",
		"separator",
		"continuationSeparator"
	]), Il = /* @__PURE__ */ new Set([
		"rStyle",
		"rFonts",
		"b",
		"bCs",
		"i",
		"iCs",
		"caps",
		"smallCaps",
		"strike",
		"dstrike",
		"outline",
		"shadow",
		"emboss",
		"imprint",
		"noProof",
		"snapToGrid",
		"vanish",
		"webHidden",
		"color",
		"spacing",
		"w",
		"kern",
		"position",
		"sz",
		"szCs",
		"highlight",
		"u",
		"effect",
		"bdr",
		"shd",
		"fitText",
		"vertAlign",
		"rtl",
		"cs",
		"em",
		"lang",
		"eastAsianLayout",
		"specVanish",
		"oMath"
	]), _l = /* @__PURE__ */ new Set([
		"ligatures",
		"numSpacing",
		"numForm",
		"stylisticSets",
		"cntxtAlts",
		"textFill",
		"textOutline",
		"shadow",
		"glow",
		"reflection",
		"scene3d",
		"props3d"
	]);
	function Cl(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Al(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function Rl(e) {
		return e.localName ?? e.tagName;
	}
	function $l(e, t, n) {
		return Al(e).find((e) => e.namespaceURI === t && Rl(e) === n);
	}
	function Dl(e) {
		return `${e.namespaceURI ?? ""}\0${Rl(e)}`;
	}
	function Pl(e) {
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return t && "r" === Rl(t) ? t : void 0;
	}
	function Ml(e) {
		const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:r="${Vn}" xmlns:mc="${El}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!t) return;
		const n = Al(t);
		return 1 === n.length && "r" === Rl(n[0]) ? n[0] : void 0;
	}
	function Fl(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function Ol(e) {
		for (let t = 0; t < e.attributes.length; t += 1) {
			const n = e.attributes[t];
			if (n && !Fl(n) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== n.namespaceURI) return !0;
		}
		return !1;
	}
	function Ll(e) {
		const t = Rl(e);
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI ? Il.has(t) : "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI ? _l.has(t) : e.namespaceURI === El && "AlternateContent" === t;
	}
	function Bl(e, t) {
		const n = $l(e, Wn, "rPr");
		if (!n) return;
		const r = Al(n), o = $l(t, Wn, "rPr"), i = o ? Al(o) : [], a = new Set(i.map(Dl)), s = r.filter((e) => !Ll(e) && !a.has(Dl(e)));
		if (0 === s.length) return;
		const l = function(e) {
			const t = $l(e, Wn, "rPr");
			if (t) return t;
			const n = e.ownerDocument.createElementNS(Wn, "w:rPr");
			return e.insertBefore(n, e.firstChild), n;
		}(t);
		for (const c of s) {
			const e = r.indexOf(c), t = r.slice(e + 1).find((e) => a.has(Dl(e))), n = t ? Al(l).find((e) => Dl(e) === Dl(t)) ?? null : null;
			l.insertBefore(c.cloneNode(!0), n);
		}
	}
	function Ul(e) {
		const t = Rl(e);
		return e.namespaceURI === El && "AlternateContent" === t ? function(e) {
			const t = (e) => Al(e).some((e) => {
				const n = Rl(e);
				return !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !Tl.has(n)) || t(e);
			});
			return t(e);
		}(e) : "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && ("rPr" === t || Tl.has(t));
	}
	function zl(e) {
		const t = Di(e);
		if (t && !Cl(t.xml) && (n = t.xml, !Si.test(n))) {
			var n;
			if (t.semanticSignature === Ai(e)) return t.xml;
			if (t.structureSignature === Ri(e)) return function(e, t) {
				if ("text" !== e.kind) return;
				const n = Pl(t);
				if (!n) return;
				const r = Al(n), o = r.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && kl.has(Rl(e))), i = o[0] ?? r.find((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "rPr" === Rl(e))) ?? null, a = Ml(`<w:r>${cl(e.text)}</w:r>`);
				if (!a) return;
				const s = Al(a);
				for (const l of s) n.insertBefore(l.cloneNode(!0), i);
				for (const l of o) n.removeChild(l);
				return new b.XMLSerializer().serializeToString(n);
			}(e, t.xml);
		}
	}
	function Hl(e, t) {
		const n = Di(e);
		if (!n || Cl(n.xml)) return t;
		const r = Pl(n.xml);
		if (!r || !function(e) {
			if (Ol(e)) return !0;
			const t = $l(e, Wn, "rPr");
			return !(!t || !Ol(t) && !Al(t).some((e) => !Ll(e))) || Al(e).some((e) => !Ul(e));
		}(r)) return t;
		const o = Ml(t);
		return o ? (function(e, t) {
			for (let n = 0; n < e.attributes.length; n += 1) {
				const r = e.attributes[n];
				if (!r || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI) continue;
				const o = r.localName ?? r.name;
				(r.namespaceURI ? t.hasAttributeNS(r.namespaceURI, o) : t.hasAttribute(r.name)) || (r.namespaceURI ? t.setAttributeNS(r.namespaceURI, r.name, r.value) : t.setAttribute(r.name, r.value));
			}
		}(r, o), Bl(r, o), function(e, t) {
			const n = Al(e), r = Al(t), o = new Set(r.map(Dl)), i = n.filter((e) => !Ul(e) && !o.has(Dl(e)));
			for (const a of i) {
				const e = n.indexOf(a), r = n.slice(e + 1).find((e) => Ul(e)), o = r ? Al(t).find((e) => Dl(e) === Dl(r)) ?? null : null;
				t.insertBefore(a.cloneNode(!0), o);
			}
		}(r, o), new b.XMLSerializer().serializeToString(o)) : t;
	}
	function jl(e, t, n, r, o) {
		if (e.revisionRangeMarker) return function(e) {
			const t = `move${"from" === e.move ? "From" : "To"}Range${"start" === e.edge ? "Start" : "End"}`, n = [`w:id="${js(e.id)}"`];
			return void 0 !== e.displacedByCustomXml && n.push(`w:displacedByCustomXml="${Zn(e.displacedByCustomXml)}"`), "start" === e.edge && (void 0 !== e.name && n.push(`w:name="${Zn(e.name)}"`), void 0 !== e.author && n.push(`w:author="${Zn(e.author)}"`), void 0 !== e.date && Number.isFinite(e.date) && n.push(`w:date="${new Date(e.date).toISOString()}"`), void 0 !== e.columnFirst && n.push(`w:colFirst="${Math.trunc(e.columnFirst)}"`), void 0 !== e.columnLast && n.push(`w:colLast="${Math.trunc(e.columnLast)}"`)), `<w:${t} ${n.join(" ")}/>`;
		}(e.revisionRangeMarker);
		if (e.__isFootnoteRefMarker) return vl("footnote");
		if (e.__isEndnoteRefMarker) return vl("endnote");
		if ("opaque" === e.kind) {
			const n = t.authorizedOpaqueFragments?.get(e.opaque.fragmentXml);
			if (!n || "￼" !== e.text || n.signature !== e.opaque.signature || n.kind !== e.opaque.objectKind || JSON.stringify(n.relationshipIds) !== JSON.stringify(e.opaque.relationshipIds)) throw new Error("Opaque DOCX objects require source-backed export with an unchanged, authorized source fragment.");
			return `<w:r>${sl(e.styles)}${e.opaque.fragmentXml}</w:r>`;
		}
		const i = zl(e);
		if (i) return i;
		const a = function(e, t, n) {
			const r = $e(e.styles, t, n), o = {
				styleId: e.styles?.styleId,
				bold: r.bold,
				italic: r.italic,
				underline: r.underline,
				underlineStyle: r.underlineStyle,
				underlineColor: r.underlineColor,
				strike: r.strike,
				doubleStrike: r.doubleStrike,
				superscript: r.superscript,
				subscript: r.subscript,
				smallCaps: r.smallCaps,
				allCaps: r.allCaps,
				hidden: r.hidden,
				noProof: r.noProof,
				webHidden: r.webHidden,
				specVanish: r.specVanish,
				rtl: r.rtl,
				complexScript: r.complexScript,
				snapToGrid: r.snapToGrid,
				fitText: r.fitText,
				emphasisMark: r.emphasisMark,
				textBorder: r.textBorder,
				outline: r.outline,
				shadow: r.shadow,
				emboss: r.emboss,
				imprint: r.imprint,
				textEffect: r.textEffect,
				characterScale: r.characterScale,
				characterSpacing: r.characterSpacing,
				baselineShift: r.baselineShift,
				kerningThreshold: r.kerningThreshold,
				ligatures: r.ligatures,
				numberSpacing: r.numberSpacing,
				numberForm: r.numberForm,
				stylisticSet: r.stylisticSet,
				contextualAlternates: r.contextualAlternates,
				fontFamily: r.fontFamily,
				fontSize: r.fontSize,
				color: r.color,
				textFill: r.textFill,
				textOutline: r.textOutline,
				textShadow: r.textShadow,
				glow: r.glow,
				reflection: r.reflection,
				scene3dXml: r.scene3dXml,
				props3dXml: r.props3dXml,
				highlight: r.highlight,
				shading: r.shading,
				language: r.language,
				propertyRevision: e.styles?.propertyRevision
			}, i = $e(e.styles?.styleId ? { styleId: e.styles.styleId } : void 0, t, n);
			for (const a of Object.keys(o)) ("styleId" !== a && e.styles?.styleId && "character" === n?.[e.styles.styleId]?.type && void 0 === e.styles[a] && o[a] === i[a] || !1 === o[a] && !1 !== e.styles?.[a] && !0 !== i[a]) && delete o[a];
			return e.styles?.link && (o.link = e.styles.link), o;
		}(e, n, r), s = () => sl(a), l = () => `<w:r>${s()}${cl(e.text)}</w:r>`;
		return Hl(e, function(e, t) {
			switch (e.kind) {
				case "opaque": return t.opaque(e);
				case "footnoteReference": return t.footnoteReference(e);
				case "endnoteReference": return t.endnoteReference(e);
				case "fieldChar": return t.fieldChar(e);
				case "fieldInstruction": return t.fieldInstruction(e);
				case "field": return t.field(e);
				case "textBox": return t.textBox(e);
				case "image": return t.image(e);
				case "sym": return t.sym(e);
				case "math": return t.math ? t.math(e) : t.text(e);
				case "text": return t.text(e);
				default: return pe(e, "run kind");
			}
		}(e, {
			footnoteReference: (e) => function(e, t, n) {
				const r = fe(e);
				return yl("footnote", r ? {
					noteId: r.footnoteId,
					customMark: r.customMark
				} : void 0, t, n);
			}(e, a, t) ?? l(),
			endnoteReference: (e) => function(e, t, n) {
				const r = he(e);
				return yl("endnote", r ? {
					noteId: r.endnoteId,
					customMark: r.customMark
				} : void 0, t, n);
			}(e, a, t) ?? l(),
			fieldChar: (e) => wl(e.fieldChar, s()),
			fieldInstruction: (e) => {
				return t = e.fieldInstruction, `<w:r>${s()}<w:instrText xml:space="preserve">${Zn(t)}</w:instrText></w:r>`;
				var t;
			},
			field: (e) => gl(e.field, s(), e.text),
			textBox: (e) => ml(e, e.textBox, t, r, s(), o),
			image: (e) => {
				const n = t.imageMap.get(e.id);
				if (n) {
					const r = hl(e.id, n, t, s());
					if (null !== r) return r;
				}
				return l();
			},
			sym: (e) => `<w:r>${s()}<w:sym w:font="${Zn(e.sym.font)}" w:char="${e.sym.char}"/></w:r>`,
			math: (e) => function(e) {
				const t = `<m:oMath>${Sl(e.children)}</m:oMath>`;
				return e.display ? `<m:oMathPara>${t}</m:oMathPara>` : t;
			}(e.math),
			opaque: () => {
				throw new Error("Unexpected opaque serializer dispatch");
			},
			text: () => l()
		}));
	}
	function ql(e, t, n, r, o) {
		let i = jl(e, t, n, r, o);
		if (e.revisionRangeMarker) return i;
		"delete" === e.revision?.type && (i = Hs(i));
		const a = e.styles?.link, s = a ? function(e, t, n) {
			if (t.startsWith("#")) return `<w:hyperlink w:anchor="${Zn(t.slice(1))}">${e}</w:hyperlink>`;
			const r = n.hyperlinkMap.get(t);
			return r ? `<w:hyperlink r:id="${r}">${e}</w:hyperlink>` : e;
		}(i, a, t) : i;
		return e.revision ? function(e, t) {
			const n = qs(t), r = function(e) {
				return "from" === e.move ? "moveFrom" : "to" === e.move ? "moveTo" : "delete" === e.type ? "del" : "ins";
			}(t);
			return `<w:${r} ${n}>${e}</w:${r}>`;
		}(s, e.revision) : s;
	}
	function Wl(e, t) {
		let n = "", r = 0;
		for (; r < e.length;) {
			const o = e[r], i = o.sdtWrappers?.[0];
			if (!i) {
				n += t(o), r += 1;
				continue;
			}
			const a = [];
			let s = r;
			for (; s < e.length && e[s].sdtWrappers?.[0]?.groupId === i.groupId;) {
				const t = e[s], n = t.sdtWrappers.slice(1);
				a.push({
					...t,
					sdtWrappers: n.length > 0 ? n : void 0
				}), s += 1;
			}
			const l = Wl(a, t);
			n += `<w:sdt>${ss(i.sdtPr)}${i.sdtEndPrXml ?? ""}<w:sdtContent>${l}</w:sdtContent></w:sdt>`, r = s;
		}
		return n;
	}
	const Gl = /* @__PURE__ */ new Set([
		"pStyle",
		"keepNext",
		"keepLines",
		"pageBreakBefore",
		"framePr",
		"widowControl",
		"numPr",
		"suppressLineNumbers",
		"pBdr",
		"shd",
		"tabs",
		"suppressAutoHyphens",
		"kinsoku",
		"wordWrap",
		"overflowPunct",
		"topLinePunct",
		"autoSpaceDE",
		"autoSpaceDN",
		"bidi",
		"adjustRightInd",
		"snapToGrid",
		"spacing",
		"ind",
		"contextualSpacing",
		"mirrorIndents",
		"suppressOverlap",
		"jc",
		"textDirection",
		"textAlignment",
		"textboxTightWrap",
		"outlineLvl",
		"divId",
		"cnfStyle",
		"rPr",
		"sectPr",
		"pPrChange"
	]);
	function Vl(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Xl(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function Zl(e) {
		return e.localName ?? e.tagName;
	}
	function Yl(e) {
		return `${e.namespaceURI ?? ""}\0${Zl(e)}`;
	}
	function Ql(e, t) {
		if (!e || Vl(e)) return t;
		const n = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "pPr" === Zl(t) ? t : void 0;
		}(e), r = function(e) {
			if (e) {
				const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}">${e}</oasis:root>`, "application/xml").documentElement, n = t ? Xl(t) : [];
				if (1 === n.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n[0].namespaceURI && "pPr" === Zl(n[0])) return n[0];
			}
			return new b.DOMParser().parseFromString(`<w:pPr xmlns:w="${Wn}"/>`, "application/xml").documentElement;
		}(t);
		if (!n || !r) return t;
		(function(e, t) {
			for (let n = 0; n < e.attributes.length; n += 1) {
				const r = e.attributes[n];
				if (!r || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI) continue;
				const o = r.localName ?? r.name;
				(r.namespaceURI ? t.hasAttributeNS(r.namespaceURI, o) : t.hasAttribute(r.name)) || (r.namespaceURI ? t.setAttributeNS(r.namespaceURI, r.name, r.value) : t.setAttribute(r.name, r.value));
			}
		})(n, r);
		const o = Xl(n), i = Xl(r), a = /* @__PURE__ */ new Map();
		for (const u of i) {
			const e = Yl(u), t = a.get(e) ?? [];
			t.push(u), a.set(e, t);
		}
		const s = /* @__PURE__ */ new Map();
		for (const u of o) {
			const e = Yl(u), t = s.get(e) ?? 0;
			s.set(e, t + 1);
			const n = a.get(e)?.[t];
			n && gs(u, n);
		}
		const l = new Set(i.map(Yl)), c = o.filter((e) => {
			return !(t = e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && Gl.has(Zl(t)) || l.has(Yl(e)));
			var t;
		});
		for (const u of c) {
			const e = o.indexOf(u), t = o.slice(e + 1).find((e) => l.has(Yl(e))), n = t ? Xl(r).find((e) => Yl(e) === Yl(t)) ?? null : null;
			r.insertBefore(u.cloneNode(!0), n);
		}
		return t || 1 !== r.attributes.length || 0 !== Xl(r).length ? new b.XMLSerializer().serializeToString(r) : "";
	}
	const Kl = /* @__PURE__ */ new Set([
		"pPr",
		"r",
		"hyperlink",
		"fldSimple",
		"bookmarkStart",
		"bookmarkEnd",
		"commentRangeStart",
		"commentRangeEnd"
	]);
	function Jl(e) {
		const t = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const r = e.childNodes[n];
			r?.nodeType === r.ELEMENT_NODE && t.push(r);
		}
		return t;
	}
	function ec(e) {
		return e.localName ?? e.tagName;
	}
	function tc(e, t) {
		const n = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:r="${Vn}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!n) return;
		const r = Jl(n);
		return 1 === r.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r[0].namespaceURI && ec(r[0]) === t ? r[0] : void 0;
	}
	function nc(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function rc(e, t) {
		const n = (r = "pPr", Jl(e).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && ec(e) === r));
		var r;
		if (!t) return n && e.removeChild(n), !0;
		const o = tc(t, "pPr");
		if (!o) return !1;
		const i = o.cloneNode(!0);
		return n ? e.replaceChild(i, n) : e.insertBefore(i, e.firstChild), !0;
	}
	function oc(e, t, n, r) {
		const o = Fi(e)?.xml;
		if (!o || r.hasOverrides || r.hasBoundaryTokens || e.dropCap || /\br:(?:id|embed|link)\s*=/.test(o)) return;
		const i = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "p" === ec(t) ? t : void 0;
		}(o);
		if (!i || !function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const n = e.attributes[t];
				if (n && !nc(n) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== n.namespaceURI) return !0;
			}
			return Jl(e).some((e) => {
				const t = ec(e);
				return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !Kl.has(t);
			});
		}(i)) return;
		const a = function(e) {
			const t = [], n = (e) => {
				for (const r of Jl(e)) {
					const e = ec(r);
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== r.namespaceURI || "r" !== e ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== r.namespaceURI || "pPr" !== e && "p" !== e && "tbl" !== e && "txbxContent" !== e) && n(r) : t.push(r);
				}
			};
			return n(e), t;
		}(i);
		if (a.length !== n.length) return;
		const s = n.map((e) => tc(e, "r"));
		if (!s.some((e) => !e) && rc(i, t)) {
			for (let e = 0; e < a.length; e += 1) a[e].parentNode?.replaceChild(s[e].cloneNode(!0), a[e]);
			return new b.XMLSerializer().serializeToString(i);
		}
	}
	function ic(e, t) {
		return e.rows.some((e) => e.cells.some((e) => e.blocks.some((e) => function(e, t) {
			switch (e.type) {
				case "paragraph": return Boolean(t.bookmarkEventsByParagraph?.has(e.id) || t.commentEventsByParagraph?.has(e.id));
				case "table": return ic(e, t);
				default: return pe(e, "block");
			}
		}(e, t))));
	}
	function ac(e, t, n) {
		switch (e.type) {
			case "paragraph": return lc(e, t, n);
			case "table": return (e.style?.pageBreakBefore ? "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>" : "") + ((function(e) {
				const t = Wi(e)?.xml;
				return Boolean(t && /<w:trPr(?:\s|>)[\s\S]*?<w:jc\b[^>]*\bw:val="(?:start|end)"/.test(t));
			}(e) ? void 0 : function(e, t) {
				const n = Wi(e);
				if (n && !t.hasBoundaryTokens && !Ti(n.xml)) return n.semanticSignature === Oi(e) ? n.xml : void 0;
			}(e, { hasBoundaryTokens: ic(e, t) })) ?? Ls(e, (e, r) => function(e, t, n, r) {
				return "paragraph" === e.type ? lc(e, n, r, { align: t.style?.horizontalAlign }) : ac(e, n, r);
			}(e, r, t, n)));
			default: return pe(e, "block");
		}
	}
	function sc(e, t, n) {
		let r = "", o = 0;
		for (; o < e.length;) {
			const i = e[o], a = i.sdtWrappers?.[0];
			if (!a) {
				r += ac(i, t, n), o += 1;
				continue;
			}
			const s = [];
			let l = o;
			for (; l < e.length && e[l].sdtWrappers?.[0]?.groupId === a.groupId;) {
				const t = e[l].sdtWrappers.slice(1);
				s.push({
					...e[l],
					sdtWrappers: t.length > 0 ? t : void 0
				}), l += 1;
			}
			const c = sc(s, t, n);
			r += `<w:sdt>${ss(a.sdtPr)}${a.sdtEndPrXml ?? ""}<w:sdtContent>${c}</w:sdtContent></w:sdt>`, o = l;
		}
		return r;
	}
	function lc(e, t, n, r) {
		const o = e.runs.length > 0 ? e.runs : [{
			id: "",
			text: "",
			kind: "text"
		}], i = e.dropCap ? function(e) {
			const t = sl(e.style);
			return `<w:p><w:pPr><w:keepNext/><w:framePr w:dropCap="${e.type}" w:lines="${e.lines}" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/><w:spacing w:after="0"/>${t ? `<w:rPr>${n = t, n.replace(/^<w:rPr>/, "").replace(/<\/w:rPr>$/, "")}</w:rPr>` : ""}</w:pPr><w:r>${t}${cl(e.text)}</w:r></w:p>`;
			var n;
		}(e.dropCap) : "", a = t.bookmarkEventsByParagraph?.get(e.id), s = t.commentEventsByParagraph?.get(e.id), l = [...(a ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: Ia(e)
		})), ...(s ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: _a(e)
		}))], c = function(e, t) {
			const n = Fi(e);
			if (!(!n?.xml || !n.semanticSignature || t.hasOverrides || t.hasBoundaryTokens || Ti(n.xml) || Si.test(n.xml) || Ni.test(n.xml))) return n.semanticSignature === Pi(e) ? n.xml : void 0;
		}(e, {
			hasOverrides: Boolean(r),
			hasBoundaryTokens: l.length > 0
		});
		if (c) return c;
		const u = (r) => ql(r, t, e.style?.styleId, n, sc), d = 0 === l.length ? o.map(u) : void 0, p = 0 === l.length ? Wl(o, u) : function(e, t, n, r, o) {
			const i = [...t].sort((e, t) => e.offset - t.offset || e.seq - t.seq);
			let a = 0, s = 0, l = Wl(e, (e) => {
				let t = "";
				const l = s, c = l + e.text.length;
				for (; a < i.length && i[a].offset <= l;) t += i[a].xml, a += 1;
				if (function(e) {
					return "text" === e.kind || "sym" === e.kind;
				}(e) && e.text.length > 0) {
					let s = l;
					for (; a < i.length && i[a].offset < c;) {
						const c = i[a];
						c.offset > s && (t += ql({
							...e,
							text: e.text.slice(s - l, c.offset - l)
						}, n, r, o, sc)), t += c.xml, a += 1, s = c.offset;
					}
					s < c && (t += ql({
						...e,
						text: e.text.slice(s - l)
					}, n, r, o, sc));
				} else t += ql(e, n, r, o, sc);
				return s = c, t;
			});
			for (; a < i.length;) l += i[a].xml, a += 1;
			return l;
		}(o, l, t, e.style?.styleId, n), f = function(e) {
			return Fi(e)?.attributes;
		}(e), h = f ? ` ${f}` : "", g = function(e, t, n) {
			const r = Fi(e)?.paragraphProperties;
			return !r || Vl(r.xml) ? t : n || e.list || r.semanticSignature !== Mi(e) ? Ql(r.xml, t) : r.xml;
		}(e, Ys(e, t.numberingInfo, n, r), Boolean(r));
		if (d) {
			const t = oc(e, g, d, {
				hasOverrides: Boolean(r),
				hasBoundaryTokens: !1
			});
			if (t) return t;
		}
		return `${i}<w:p${h}>${g}${p}</w:p>`;
	}
	function cc(e) {
		const t = e.footnotes?.items;
		if (!t) return [];
		const n = /* @__PURE__ */ new Map(), r = $a(t);
		for (const { run: o } of function(e) {
			return ca(e, "footnoteReference");
		}(e)) {
			const e = fe(o);
			if (!e || n.has(e.footnoteId)) continue;
			const i = t[e.footnoteId];
			i && n.set(e.footnoteId, {
				footnoteId: e.footnoteId,
				docxId: r(i),
				footnote: i
			});
		}
		return Array.from(n.values());
	}
	function uc(e) {
		if (0 === e.length) return [dc()];
		const [t, ...n] = e;
		return "paragraph" !== t.type ? [
			dc(!0),
			t,
			...n
		] : [(r = t, {
			...r,
			runs: [{
				id: "synthetic:footnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "FootnoteReference",
					superscript: !0
				},
				__isFootnoteRefMarker: !0
			}, ...r.runs],
			style: r.style?.styleId ? r.style : {
				...r.style ?? {},
				styleId: "FootnoteText"
			}
		}), ...n];
		var r;
	}
	function dc(e = !0) {
		return {
			id: "synthetic:footnote-body-empty",
			type: "paragraph",
			runs: [...e ? [{
				id: "synthetic:footnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "FootnoteReference",
					superscript: !0
				},
				__isFootnoteRefMarker: !0
			}] : [], {
				id: "synthetic:footnote-body-empty-text",
				text: "",
				kind: "text"
			}],
			style: { styleId: "FootnoteText" }
		};
	}
	function pc(e) {
		const t = e.endnotes?.items;
		if (!t) return [];
		const n = /* @__PURE__ */ new Map(), r = $a(t);
		for (const { run: o } of function(e) {
			return ca(e, "endnoteReference");
		}(e)) {
			const e = he(o);
			if (!e || n.has(e.endnoteId)) continue;
			const i = t[e.endnoteId];
			i && n.set(e.endnoteId, {
				endnoteId: e.endnoteId,
				docxId: r(i),
				endnote: i
			});
		}
		return Array.from(n.values());
	}
	function fc(e) {
		if (0 === e.length) return [hc()];
		const [t, ...n] = e;
		return "paragraph" !== t.type ? [
			hc(!0),
			t,
			...n
		] : [(r = t, {
			...r,
			runs: [{
				id: "synthetic:endnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "EndnoteReference",
					superscript: !0
				},
				__isEndnoteRefMarker: !0
			}, ...r.runs],
			style: r.style?.styleId ? r.style : {
				...r.style ?? {},
				styleId: "EndnoteText"
			}
		}), ...n];
		var r;
	}
	function hc(e = !0) {
		return {
			id: "synthetic:endnote-body-empty",
			type: "paragraph",
			runs: [...e ? [{
				id: "synthetic:endnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "EndnoteReference",
					superscript: !0
				},
				__isEndnoteRefMarker: !0
			}] : [], {
				id: "synthetic:endnote-body-empty-text",
				text: "",
				kind: "text"
			}],
			style: { styleId: "EndnoteText" }
		};
	}
	const mc = [
		"wholeTable",
		"band1Horz",
		"band2Horz",
		"band1Vert",
		"band2Vert",
		"firstCol",
		"lastCol",
		"firstRow",
		"lastRow",
		"nwCell",
		"neCell",
		"swCell",
		"seCell"
	];
	function gc(e) {
		const t = {
			...e.borders ? {
				...e.borders.borderTop ? { borderTop: e.borders.borderTop } : {},
				...e.borders.borderLeft ? { borderLeft: e.borders.borderLeft } : {},
				...e.borders.borderBottom ? { borderBottom: e.borders.borderBottom } : {},
				...e.borders.borderRight ? { borderRight: e.borders.borderRight } : {}
			} : {},
			...e.shading ? { shading: e.shading } : {},
			...e.cellStyle
		};
		return Object.keys(t).length > 0 ? Qa({
			id: "table-style-cell",
			blocks: [],
			style: t
		}) : "";
	}
	function wc(e, t) {
		if ("number" == typeof t) return `<w:${e} w:w="${Kn(t) ?? 0}" w:type="dxa"/>`;
		if ("string" == typeof t && t.endsWith("%")) {
			const n = Number.parseFloat(t);
			return Number.isFinite(n) ? `<w:${e} w:w="${Math.round(50 * n)}" w:type="pct"/>` : "";
		}
		return "auto" === t ? `<w:${e} w:w="0" w:type="auto"/>` : "";
	}
	function bc(e) {
		if (!e) return "";
		const t = [];
		void 0 !== e.rowBandSize && t.push(`<w:tblStyleRowBandSize w:val="${e.rowBandSize}"/>`), void 0 !== e.colBandSize && t.push(`<w:tblStyleColBandSize w:val="${e.colBandSize}"/>`);
		const n = wc("tblW", e.width);
		n && t.push(n);
		const r = wc("tblInd", e.indentLeft);
		r && t.push(r);
		const o = wc("tblCellSpacing", e.cellSpacing);
		if (o && t.push(o), e.align && t.push(`<w:jc w:val="${e.align}"/>`), e.layout && t.push(`<w:tblLayout w:type="${e.layout}"/>`), void 0 !== e.bidiVisual && t.push(`<w:bidiVisual w:val="${e.bidiVisual ? "1" : "0"}"/>`), e.defaultCellMargins) {
			const n = Object.entries(e.defaultCellMargins).map(([e, t]) => `<w:${e} w:w="${Kn(t) ?? 0}" w:type="dxa"/>`).join("");
			n && t.push(`<w:tblCellMar>${n}</w:tblCellMar>`);
		}
		if (e.borders) {
			const { borders: n } = e, r = Tr.filter(([, e]) => !!n[e]).map(([e, t]) => `<w:${e} ${Ua(n[t])}`).join("");
			r && t.push(`<w:tblBorders>${r}</w:tblBorders>`);
		}
		return t.length > 0 ? `<w:tblPr>${Ba(t, Ma)}</w:tblPr>` : "";
	}
	function vc(e, t) {
		const n = [], r = t.paragraphStyle ? Zs(t.paragraphStyle) : "";
		r && n.push(r);
		const o = t.textStyle ? sl(t.textStyle) : "";
		o && n.push(o);
		const i = bc(t.tableStyle);
		i && n.push(i);
		const a = t.rowStyle ? es(t.rowStyle) : "";
		a && n.push(a);
		const s = gc(t);
		return s && n.push(s), 0 === n.length ? "" : `<w:tblStylePr w:type="${Zn(e)}">${n.join("")}</w:tblStylePr>`;
	}
	function yc(e, t) {
		const n = Object.values(e).map((e) => function(e, t) {
			const n = [];
			n.push(`<w:name w:val="${Zn(e.name)}"/>`), e.basedOn && n.push(`<w:basedOn w:val="${Zn(e.basedOn)}"/>`), e.nextStyle && n.push(`<w:next w:val="${Zn(e.nextStyle)}"/>`), void 0 !== e.uiPriority && n.push(`<w:uiPriority w:val="${Math.max(0, Math.floor(e.uiPriority))}"/>`);
			for (const r of [
				"qFormat",
				"semiHidden",
				"unhideWhenUsed"
			]) {
				const t = e[r];
				void 0 !== t && n.push(t ? `<w:${r}/>` : `<w:${r} w:val="off"/>`);
			}
			if (("paragraph" === e.type || "table" === e.type) && e.paragraphStyle) {
				const r = t?.get(e.id), o = r ? `<w:numPr><w:ilvl w:val="${r.level}"/><w:numId w:val="${r.numId}"/></w:numPr>` : void 0, i = Zs(e.paragraphStyle, o);
				i && n.push(i);
			}
			if (e.textStyle) {
				const t = sl(e.textStyle);
				t && n.push(t);
			}
			if ("table" === e.type && e.tableStyle) {
				const t = e.tableStyle, r = bc(t);
				if (r && n.push(r), t.conditionalFormats) {
					const e = [...mc.filter((e) => e in t.conditionalFormats), ...Object.keys(t.conditionalFormats).filter((e) => !mc.includes(e))];
					for (const r of e) {
						const e = t.conditionalFormats[r];
						if (e) {
							const t = vc(r, e);
							t && n.push(t);
						}
					}
				}
			}
			return `<w:style w:type="${"character" === e.type ? "character" : "table" === e.type ? "table" : "paragraph"}" w:styleId="${Zn(e.id)}"${e.isDefault ? " w:default=\"1\"" : ""}${void 0 !== e.customStyle ? ` w:customStyle="${e.customStyle ? "1" : "0"}"` : ""}>${Ba(n, Fa)}</w:style>`;
		}(e, t)).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="${Xn}">${n}</w:styles>`;
	}
	function xc(e, t, n, r, o, i, a, s, l, c = !1) {
		const u = r.map((e) => {
			const t = "header" === e.kind ? "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml" : "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";
			return `<Override PartName="/word/${e.path}" ContentType="${t}"/>`;
		}).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${function(e) {
			const t = /* @__PURE__ */ new Set();
			let n = "";
			for (const r of e) {
				const e = r.toLowerCase();
				if (t.has(e)) continue;
				const o = un[e];
				o && (t.add(e), n += `<Default Extension="${e}" ContentType="${o}"/>`);
			}
			return n;
		}(t)}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${a ? "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" : ""}${e ? "<Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/>" : ""}${n ? "<Override PartName=\"/word/settings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml\"/>" : ""}${o ? "<Override PartName=\"/word/footnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml\"/>" : ""}${i ? "<Override PartName=\"/word/endnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml\"/>" : ""}${s ? "<Override PartName=\"/word/comments.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml\"/><Override PartName=\"/word/commentsExtended.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml\"/>" : ""}${l ? "<Override PartName=\"/word/fontTable.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml\"/>" : ""}${c ? "<Override PartName=\"/word/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>" : ""}${u}</Types>`;
	}
	const Sc = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, Nc = {
		continuous: "continuous",
		eachSection: "eachSect"
	};
	function Ec(e, t) {
		if (!t) return null;
		const n = [];
		return t.numberFormat && n.push(`<w:numFmt w:val="${Sc[t.numberFormat]}"/>`), void 0 !== t.startAt && n.push(`<w:numStart w:val="${Math.max(1, t.startAt)}"/>`), t.restart && n.push(`<w:numRestart w:val="${Nc[t.restart]}"/>`), n.length > 0 ? `<w:${e}>${n.join("")}</w:${e}>` : null;
	}
	function kc(e, t, n, r, o, i, a) {
		const s = [], l = Kn(t);
		null !== l && Number.isFinite(l) && l > 0 && s.push(`<w:defaultTabStop w:val="${l}"/>`), i?.autoHyphenation && s.push("<w:autoHyphenation/>"), void 0 !== i?.consecutiveHyphenLimit && i.consecutiveHyphenLimit >= 0 && s.push(`<w:consecutiveHyphenLimit w:val="${i.consecutiveHyphenLimit}"/>`);
		const c = Kn(i?.hyphenationZone);
		null !== c && s.push(`<w:hyphenationZone w:val="${c}"/>`), i?.doNotHyphenateCaps && s.push("<w:doNotHyphenateCaps/>");
		const u = Ec("footnotePr", n);
		u && s.push(u);
		const d = Ec("endnotePr", r);
		return d && s.push(d), e && s.push("<w:evenAndOddHeaders/>"), o && s.push("<w:compat><w:allowSpaceOfSameStyleInTable/></w:compat>"), s.push(function(e) {
			if (!e) return "";
			const t = Object.entries(e);
			if (t.length > 256) return "";
			const n = /* @__PURE__ */ new Set(), r = [];
			for (const [o, i] of t) {
				if (!tr(o) || "string" != typeof i || !nr(i)) return "";
				const e = o.toLowerCase();
				if (n.has(e) || "__proto__" === e || "prototype" === e || "constructor" === e) return "";
				n.add(e), r.push("<w:docVar w:name=\"" + Zn(o) + "\" w:val=\"" + Zn(i) + "\"/>");
			}
			return r.length ? "<w:docVars>" + r.join("") + "</w:docVars>" : "";
		}(a)), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${Wn}">${s.join("")}</w:settings>`;
	}
	function Tc(e, t) {
		let n = "";
		for (const r of t) n += `<Relationship Id="${r.rId}" Type="${Vn}/hyperlink" Target="${Zn(r.href)}" TargetMode="External"/>`;
		for (const r of e) {
			const e = "linked" === r.kind ? " TargetMode=\"External\"" : "";
			n += `<Relationship Id="${r.rId}" Type="${Vn}/image" Target="${Zn(r.target)}"${e}/>`;
		}
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${Gn}">${n}</Relationships>`;
	}
	function Ic(e, t) {
		t(e);
		for (const n of e.runs) "textBox" === n.kind && _c(n.textBox.blocks, t);
	}
	function _c(e, t) {
		for (const n of e) switch (n.type) {
			case "paragraph":
				Ic(n, t);
				break;
			case "table":
				for (const e of n.rows) for (const n of e.cells) _c(n.blocks, t);
				break;
			default: pe(n, "block");
		}
	}
	function Cc(e, t) {
		for (let n = 0; n < e.attributes.length; n += 1) {
			const r = e.attributes.item(n);
			if (r?.localName === t) return r.value;
		}
	}
	function Ac(e, t, n) {
		if (!e) return 0;
		const r = new b.DOMParser().parseFromString(e, "application/xml");
		let o = 0;
		for (const i of Array.from(r.getElementsByTagNameNS(Wn, t))) {
			const e = Cc(i, n);
			if (!e || !/^\d+$/.test(e)) continue;
			const t = Number.parseInt(e, 10);
			Number.isSafeInteger(t) && (o = Math.max(o, t));
		}
		return o;
	}
	function Rc(e, t) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= t;
	}
	function $c(e) {
		const t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), o = [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), s = function(e) {
			const t = e.sourcePackage;
			if (!t) return;
			const n = t.parts[t.mainDocumentPart]?.relationships?.find((e) => "External" !== e.targetMode && e.type.endsWith("/numbering") && Boolean(e.resolvedTarget)), r = n?.resolvedTarget ? t.parts[n.resolvedTarget] : void 0;
			return "xml" === r?.kind ? r.data : void 0;
		}(e);
		let l = Math.max(1, Ac(s, "abstractNum", "abstractNumId") + 1), c = Math.max(1, Ac(s, "num", "numId") + 1);
		const u = (e) => {
			if (Rc(e, 0) && !i.has(e)) return i.add(e), e;
			for (; i.has(l);) l += 1;
			const t = l;
			return l += 1, i.add(t), t;
		}, d = (e) => {
			if (Rc(e, 1) && !a.has(e)) return a.add(e), e;
			for (; a.has(c);) c += 1;
			const t = c;
			return c += 1, a.add(t), t;
		}, p = [], f = (e) => {
			e.list && p.push(e);
		};
		for (const b of Fe(e)) _c(b.blocks, f), b.header && _c(b.header, f), b.firstPageHeader && _c(b.firstPageHeader, f), b.evenPageHeader && _c(b.evenPageHeader, f), b.footer && _c(b.footer, f), b.firstPageFooter && _c(b.firstPageFooter, f), b.evenPageFooter && _c(b.evenPageFooter, f);
		const h = (e, t) => {
			const n = Math.max(0, e.level ?? 0), i = e.bulletGlyph ?? "", a = t ?? (e.instanceId ? `instance:${e.instanceId}` : `legacy:${e.kind}:${n}:${i}`);
			let s = r.get(a);
			if (!s) {
				const t = Rt(e), n = void 0 !== t?.sourceNumId && e.instanceId === String(t.sourceNumId);
				s = {
					abstractNumId: u(n ? t.sourceAbstractNumId : void 0),
					numId: d(n ? t.sourceNumId : void 0),
					levels: []
				}, r.set(a, s), o.push(s);
			}
			if (!s.levels.some((e) => e.level === n)) {
				const t = Rt(e), r = function(e) {
					const t = Rt(e);
					if (t?.format && t.importedKind === e.kind && t.importedFormat === e.format) return t.format;
				}(e);
				s.levels.push({
					kind: e.kind,
					level: n,
					format: e.format,
					startAt: e.startAt,
					levelText: e.levelText,
					suffix: e.suffix,
					alignment: e.alignment,
					legal: e.legal,
					bulletGlyph: e.bulletGlyph,
					bulletFont: e.bulletFont,
					...t ? { ooxml: {
						...t,
						...r ? { format: r } : { format: void 0 }
					} } : {}
				});
			}
			return {
				numId: s.numId,
				level: n
			};
		}, m = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
		let w;
		for (const b of p) {
			const e = b.list, n = e.instanceId ? `instance:${e.instanceId}` : `legacy:${e.kind}:${e.level ?? 0}:${e.bulletGlyph ?? ""}`, r = m.get(n) ?? 0;
			let o;
			m.set(n, r + 1), "number" == typeof e.startAt && r > 0 ? (w?.baseKey === n && w.startAt === e.startAt || (w = {
				baseKey: n,
				startAt: e.startAt,
				key: `${n}:restart:${b.id}`
			}), g.set(n, w.key), o = w.key) : g.has(n) ? (o = g.get(n), w = void 0) : w = void 0, t.set(b.id, h(e, o));
		}
		for (const b of Object.values(e.styles ?? {})) "paragraph" === b.type && b.paragraphStyle?.list && n.set(b.id, h(b.paragraphStyle.list));
		return {
			numberingInfo: t,
			definitions: o,
			styleNumbering: n
		};
	}
	const Dc = `xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:r="${Vn}"`;
	function Pc(e, t, n, r) {
		const o = Yn(e.width, 12240), i = Yn(e.height, 15840), a = e.margins, s = "landscape" === e.orientation ? " w:orient=\"landscape\"" : "", l = [
			t?.header?.first ? `<w:headerReference w:type="first" r:id="${t.header.first.relId}"/>` : "",
			t?.header?.even ? `<w:headerReference w:type="even" r:id="${t.header.even.relId}"/>` : "",
			t?.header?.default ? `<w:headerReference w:type="default" r:id="${t.header.default.relId}"/>` : "",
			t?.footer?.first ? `<w:footerReference w:type="first" r:id="${t.footer.first.relId}"/>` : "",
			t?.footer?.even ? `<w:footerReference w:type="even" r:id="${t.footer.even.relId}"/>` : "",
			t?.footer?.default ? `<w:footerReference w:type="default" r:id="${t.footer.default.relId}"/>` : ""
		].join(""), c = t?.header?.first || t?.footer?.first ? "<w:titlePg/>" : "", u = r && "nextPage" !== r ? `<w:type w:val="${r}"/>` : "", d = e.columns;
		let p = "";
		if (d && d.count > 1) {
			const e = Yn(d.space, 0), t = d.separator ? " w:sep=\"1\"" : "";
			if (!1 === d.equalWidth && d.columns?.length) {
				const n = d.columns.map((e) => `<w:col w:w="${Yn(e.width, 0)}" w:space="${Yn(e.space, 0)}"/>`).join("");
				p = `<w:cols w:num="${d.count}" w:space="${e}" w:equalWidth="0"${t}>${n}</w:cols>`;
			} else p = `<w:cols w:num="${d.count}" w:space="${e}"${t}/>`;
		}
		const f = n.pageNumbering;
		let h = "";
		if (f) {
			const e = [];
			void 0 !== f.start && e.push(`w:start="${f.start}"`), f.format && e.push(`w:fmt="${Zn(f.format)}"`), f.chapterStyle && e.push(`w:chapStyle="${Zn(f.chapterStyle)}"`), f.chapterSeparator && e.push(`w:chapSep="${Zn(f.chapterSeparator)}"`), e.length > 0 && (h = `<w:pgNumType ${e.join(" ")}/>`);
		}
		const m = n.verticalAlignment && "top" !== n.verticalAlignment ? `<w:vAlign w:val="${n.verticalAlignment}"/>` : "", g = n.bidi ? "<w:bidi/>" : "", w = n.pageBorder, b = w?.color.replace("#", "").toUpperCase(), v = w ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:left w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:bottom w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:right w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/></w:pgBorders>` : "", y = n.propertyRevision ? `<w:sectPrChange ${qs(n.propertyRevision)}>${Pc(n.propertyRevision.previous.pageSettings, void 0, (x = n.propertyRevision.previous, {
			id: "section:revision",
			blocks: [],
			pageSettings: x.pageSettings,
			...void 0 !== x.pageBorder ? { pageBorder: x.pageBorder } : {},
			...x.pageNumbering ? { pageNumbering: x.pageNumbering } : {},
			...x.verticalAlignment ? { verticalAlignment: x.verticalAlignment } : {},
			...void 0 !== x.bidi ? { bidi: x.bidi } : {}
		}), n.propertyRevision.previous.nextBreakType)}</w:sectPrChange>` : "";
		var x;
		return `<w:sectPr>${l}${c}${u}<w:pgSz w:w="${o}" w:h="${i}"${s}/><w:pgMar w:top="${Yn(a.top, 1440)}" w:right="${Yn(a.right, 1440)}" w:bottom="${Yn(a.bottom, 1440)}" w:left="${Yn(a.left, 1440)}" w:header="${Yn(a.header, 720)}" w:footer="${Yn(a.footer, 720)}" w:gutter="${Yn(a.gutter, 0)}"/>${h}${p}${m}${g}${v}${y}</w:sectPr>`;
	}
	function Mc(e, t, n) {
		const r = Fe(e), o = r.map((o, i) => sc(o.blocks, t, e.styles) + Pc(o.pageSettings, n[i], o, r[i + 1]?.breakType)).join(""), i = e.design?.pageColor?.replace("#", "").toUpperCase();
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${Dc}>${i ? `<w:background w:color="${i}"/>` : ""}<w:body>${o}</w:body></w:document>`;
	}
	function Fc(e, t, n, r, o) {
		const i = "header" === e ? "hdr" : "ftr", a = "header" === e && "text" === o?.kind && o.text ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml"><v:shape type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#94a3b8"}" fillopacity="${o.opacity ?? .25}"><v:textpath on="true" string="${Zn(o.text)}" style="font-family:${Zn(o.fontFamily ?? "Arial")};font-size:${o.fontSize ?? 48}pt"/></v:shape></w:pict>` : "header" === e && "image" === o?.kind && n.images.some((e) => "__watermark" === e.runId) ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shape type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#ffffff"}" fillopacity="${o.opacity ?? .25}" stroked="f"><v:imagedata r:id="rIdWatermark" o:title="Watermark"/></v:shape></w:pict>` : "";
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${i} ${Dc}>${a}${sc(t, n, r)}</w:${i}>`;
	}
	function Oc(e) {
		const t = [], n = [], r = [], o = (e, t) => {
			(e.separator ? e.result : e.code).push(t);
		}, i = (e, t) => {
			n.push({
				kind: e,
				point: t
			});
		};
		for (const [a, s] of e.entries()) {
			let e = 0;
			for (const [n, l] of s.runs.entries()) {
				const c = {
					paragraphId: s.id,
					paragraphIndex: a,
					runId: l.id,
					runIndex: n,
					offset: e
				};
				e += l.text.length;
				const u = r.at(-1);
				if ("fieldChar" === l.kind) switch (l.fieldChar.kind) {
					case "begin": {
						const e = {
							index: t.length,
							parentIndex: u?.index ?? null,
							begin: c,
							beginMarker: { ...l.fieldChar },
							code: [],
							result: []
						};
						u && o(u, {
							kind: "nested",
							fieldIndex: e.index
						}), t.push(e), r.push(e);
						break;
					}
					case "separate":
						u ? u.separator ? i("duplicate-separator", c) : u.separator = c : i("orphan-separator", c);
						break;
					case "end": u ? (u.end = c, r.pop()) : i("orphan-end", c);
				}
				else "fieldInstruction" === l.kind ? u ? (u.separator && i("instruction-after-separator", c), o(u, {
					kind: "instruction",
					point: c,
					raw: l.fieldInstruction
				})) : i("orphan-instruction", c) : u && o(u, {
					kind: "run",
					point: c
				});
			}
		}
		for (const a of r) i("unclosed-field", a.begin);
		return {
			spans: t,
			diagnostics: n
		};
	}
	const Lc = [
		"am/pm",
		"AM/PM",
		"dddd",
		"MMMM",
		"yyyy",
		"ddd",
		"MMM",
		"dd",
		"MM",
		"yy",
		"HH",
		"hh",
		"mm",
		"ss",
		"d",
		"M",
		"H",
		"h",
		"m",
		"s"
	];
	function Bc(e) {
		if (!e.length || e.length > 256) return;
		const t = [];
		for (let n = 0; n < e.length;) {
			const r = e[n];
			if ("'" === r) {
				const r = e.indexOf("'", n + 1);
				if (r < 0) return;
				t.push({ literal: e.slice(n + 1, r) }), n = r + 1;
				continue;
			}
			const o = Lc.find((t) => e.startsWith(t, n));
			if (o) {
				if (n += o.length, n < e.length && e[n] === o[0] && "am/pm" !== o && "AM/PM" !== o) return;
				t.push({ token: o });
			} else {
				if (/[\p{L}\\\x00-\x1f]/u.test(r)) return;
				t.push({ literal: r }), n++;
			}
		}
		return t.some((e) => "token" in e) ? t : void 0;
	}
	function Uc(e) {
		return !!Bc(e);
	}
	const zc = /* @__PURE__ */ new Set([
		"DATE",
		"TIME",
		"CREATEDATE",
		"SAVEDATE",
		"PRINTDATE"
	]), Hc = {
		DATE: {
			key: "now",
			dependency: "clock"
		},
		TIME: {
			key: "now",
			dependency: "clock"
		},
		CREATEDATE: {
			key: "created",
			dependency: "created"
		},
		SAVEDATE: {
			key: "saved",
			dependency: "saved"
		},
		PRINTDATE: {
			key: "printed",
			dependency: "printed"
		}
	}, jc = /* @__PURE__ */ new Set([
		"PAGE",
		"NUMPAGES",
		"SECTION",
		"SECTIONPAGES"
	]), qc = /* @__PURE__ */ new Set(["REF", "PAGEREF"]), Wc = {
		PAGE: {
			key: "pageNumber",
			dependency: "page"
		},
		NUMPAGES: {
			key: "totalPages",
			dependency: "document-pages"
		},
		SECTION: {
			key: "sectionNumber",
			dependency: "section"
		},
		SECTIONPAGES: {
			key: "sectionPages",
			dependency: "section-pages"
		}
	};
	function Gc(e) {
		const t = Ao(e);
		if (t.error || !t.command) return;
		const n = t.tokens.slice(1);
		if ("DOCPROPERTY" === t.command) {
			if (1 !== n.length && 3 !== n.length) return;
			const e = n[0];
			if (!e || "word" !== e.kind && "quoted" !== e.kind || e.value.length < 1 || e.value.length > 128 || !/^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e.value)) return;
			if (3 === n.length && ("switch" !== n[1]?.kind || "*" !== n[1].value || "word" !== n[2]?.kind || "MERGEFORMAT" !== n[2].value)) return;
			return {
				type: "DOCPROPERTY",
				name: e.value
			};
		}
		if ("DOCVARIABLE" === t.command) {
			if (1 !== n.length || "word" !== n[0]?.kind && "quoted" !== n[0]?.kind) return;
			const e = n[0].value;
			if (e.length < 1 || e.length > 128 || !/^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e)) return;
			return {
				type: "DOCVARIABLE",
				name: e
			};
		}
		if ("IF" === t.command) {
			if (5 !== n.length) return;
			const [e, t, r, o, i] = n;
			if (!e || !t || !r || !o || !i || "word" !== e.kind && "quoted" !== e.kind || "word" !== t.kind || ![
				"=",
				"<>",
				"<",
				">",
				"<=",
				">="
			].includes(t.value) || "word" !== r.kind && "quoted" !== r.kind || "quoted" !== o.kind || "quoted" !== i.kind || [
				e,
				r,
				o,
				i
			].some((e) => e.value.length > 4096 || /[\r\n\t]/.test(e.value))) return;
			const a = (e) => "quoted" === e.kind || /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(e.value);
			if (!a(e) || !a(r)) return;
			const s = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, l = s.test(e.value) && s.test(r.value);
			if (l && (!Number.isFinite(Number(e.value)) || !Number.isFinite(Number(r.value)))) return;
			if (!l && "=" !== t.value && "<>" !== t.value) return;
			return {
				type: "IF",
				left: e.value,
				right: r.value,
				operator: t.value,
				whenTrue: o.value,
				whenFalse: i.value,
				numeric: l
			};
		}
		if ("STYLEREF" === t.command) {
			const e = n[0];
			if (!e || "quoted" !== e.kind && "word" !== e.kind || !e.value.trim() || e.value.length > 128 || /[\r\n\t\\]/.test(e.value)) return;
			let t, r = !1;
			for (const o of n.slice(1)) {
				if ("switch" !== o.kind) return;
				const e = o.value.toLowerCase();
				if ("l" === e) {
					if (r) return;
					r = !0;
				} else {
					if ("n" !== e && "p" !== e) return;
					if (t) return;
					t = "n" === e ? "number" : "position";
				}
			}
			return t ? {
				type: "STYLEREF",
				style: e.value,
				lastOnPage: r,
				output: t
			} : {
				type: "STYLEREF",
				style: e.value,
				lastOnPage: r
			};
		}
		if ("SEQ" === t.command) {
			const e = n[0];
			if (!e || "word" !== e.kind || !/^\p{L}[\p{L}\p{N}_]{0,39}$/u.test(e.value)) return;
			const t = {
				type: "SEQ",
				identifier: e.value.toLowerCase(),
				operation: "next"
			}, r = /* @__PURE__ */ new Set();
			for (let o = 1; o < n.length; o++) {
				const e = n[o];
				if ("switch" !== e.kind) return;
				const i = e.value.toLowerCase();
				if (r.has(i)) return;
				if (r.add(i), "n" === i || "c" === i || "r" === i) {
					if ([
						"n",
						"c",
						"r"
					].filter((e) => r.has(e)).length > 1) return;
					if (t.operation = "c" === i ? "repeat" : "r" === i ? "reset" : "next", "r" === i) {
						const e = n[++o];
						if ("word" !== e?.kind || !/^\d{1,7}$/.test(e.value) || !Xc(Number(e.value))) return;
						t.reset = Number(e.value);
					}
				} else if ("s" === i) {
					const e = n[++o];
					if ("word" !== e?.kind || !/^[1-9]$/.test(e.value)) return;
					t.headingLevel = Number(e.value);
				} else {
					if ("*" !== i) return;
					{
						const e = n[++o];
						if ("word" !== e?.kind) return;
						const r = "ARABIC" === e.value.toUpperCase() ? "decimal" : Io(e.value);
						if (!r) return;
						t.format = r;
					}
				}
			}
			if (void 0 !== t.headingLevel && "next" !== t.operation) return;
			return t;
		}
		if (zc.has(t.command)) {
			const e = t.command;
			if (!n.length) return {
				type: e,
				temporal: !0
			};
			if (2 !== n.length || "switch" !== n[0]?.kind || "@" !== n[0].value || "quoted" !== n[1]?.kind || !Uc(n[1].value)) return;
			return {
				type: e,
				temporal: !0,
				picture: n[1].value
			};
		}
		if (jc.has(t.command)) {
			const e = t.command;
			if (0 === n.length) return { type: e };
			if (2 !== n.length || "switch" !== n[0]?.kind || "*" !== n[0].value || "word" !== n[1]?.kind) return;
			const r = Io(n[1].value);
			return r ? {
				type: e,
				format: r
			} : void 0;
		}
		if (qc.has(t.command)) {
			const e = n[0];
			if (!e || "switch" === e.kind || !e.value) return;
			const r = 2 === n.length && "switch" === n[1]?.kind && "h" === n[1].value.toLowerCase();
			if (1 !== n.length && !r) return;
			const o = t.command;
			return r ? {
				type: o,
				bookmark: e.value,
				hyperlink: !0
			} : {
				type: o,
				bookmark: e.value
			};
		}
	}
	function Vc(e, t, n = []) {
		return {
			status: "preserved",
			text: e,
			reason: t,
			dependencies: n
		};
	}
	function Xc(e) {
		return "number" == typeof e && Number.isSafeInteger(e) && e >= 1 && e <= 1e6;
	}
	function Zc(e, t, n, r = !1) {
		if (r) return Vc(n, "locked");
		if ("IF_NESTED" === e.type) {
			const r = [{ kind: "literal-condition" }], o = (e) => {
				if ("literal" === e.kind) return e.value;
				const n = e.name.toLowerCase();
				return r.push("document-variable" === e.kind ? {
					kind: "document-variable",
					name: n
				} : {
					kind: "document-property",
					name: n
				}), "document-variable" === e.kind ? or(t.documentVariables, e.name) : G(t.documentProperties, e.name);
			}, i = o(e.left), a = o(e.right);
			if (void 0 === i || void 0 === a || i.length > 4096 || a.length > 4096 || /[\r\n\t\u0000-\u001f]/.test(i) || /[\r\n\t\u0000-\u001f]/.test(a)) return Vc(n, "unresolved", r);
			const s = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, l = s.test(i) && s.test(a) && Number.isFinite(Number(i)) && Number.isFinite(Number(a));
			if (!l && "=" !== e.operator && "<>" !== e.operator) return Vc(n, "unresolved", r);
			const c = l ? Number(i) : i, u = l ? Number(a) : a;
			let d = !1;
			switch (e.operator) {
				case "=":
					d = c === u;
					break;
				case "<>":
					d = c !== u;
					break;
				case "<":
					d = "number" == typeof c && "number" == typeof u && c < u;
					break;
				case ">":
					d = "number" == typeof c && "number" == typeof u && c > u;
					break;
				case "<=":
					d = "number" == typeof c && "number" == typeof u && c <= u;
					break;
				case ">=": d = "number" == typeof c && "number" == typeof u && c >= u;
			}
			return {
				status: "resolved",
				text: d ? e.whenTrue : e.whenFalse,
				dependencies: r
			};
		}
		if ("DOCPROPERTY" === e.type) {
			const r = [{
				kind: "document-property",
				name: e.name.toLowerCase()
			}], o = G(t.documentProperties, e.name);
			return void 0 === o ? Vc(n, "unresolved", r) : {
				status: "resolved",
				text: o,
				dependencies: r
			};
		}
		if ("DOCVARIABLE" === e.type) {
			const r = [{
				kind: "document-variable",
				name: e.name.toLowerCase()
			}], o = or(t.documentVariables, e.name);
			return void 0 === o ? Vc(n, "unresolved", r) : {
				status: "resolved",
				text: o,
				dependencies: r
			};
		}
		if ("IF" === e.type) {
			const t = [{ kind: "literal-condition" }], n = e.numeric ? Number(e.left) : e.left, r = e.numeric ? Number(e.right) : e.right;
			let o;
			switch (e.operator) {
				case "=":
					o = n === r;
					break;
				case "<>":
					o = n !== r;
					break;
				case "<":
					o = "number" == typeof n && "number" == typeof r && n < r;
					break;
				case ">":
					o = "number" == typeof n && "number" == typeof r && n > r;
					break;
				case "<=":
					o = "number" == typeof n && "number" == typeof r && n <= r;
					break;
				case ">=": o = "number" == typeof n && "number" == typeof r && n >= r;
			}
			return {
				status: "resolved",
				text: o ? e.whenTrue : e.whenFalse,
				dependencies: t
			};
		}
		if ("STYLEREF" === e.type) {
			const r = [{
				kind: "style-text",
				name: e.style,
				lastOnPage: e.lastOnPage
			}], o = t.styleRefText?.(e.style, e.lastOnPage, e.output ?? "text");
			return "string" == typeof o && o.length > 0 ? {
				status: "resolved",
				text: o,
				dependencies: r
			} : Vc(n, "unresolved", r);
		}
		if ("SEQ" === e.type) {
			const r = [{
				kind: "sequence",
				name: e.identifier
			}];
			return Xc(t.sequenceValue) ? {
				status: "resolved",
				text: _o(t.sequenceValue, e.format),
				dependencies: r
			} : Vc(n, "unresolved", r);
		}
		if ("temporal" in e) {
			const r = Hc[e.type], o = [{ kind: r.dependency }], i = t.temporal?.[r.key];
			if (void 0 === i) return Vc(n, "unresolved", o);
			const a = e.picture ?? ("TIME" === e.type ? "HH:mm" : "pt-BR" === t.temporal?.locale ? "dd/MM/yyyy" : "M/d/yyyy");
			if (!Uc(a)) return Vc(n, "unsupported", o);
			const s = function(e, t, n = {}) {
				const r = Bc(t);
				if (!r || !Number.isFinite(e)) return;
				const o = new Date(e);
				if (Number.isFinite(o.getTime())) try {
					const e = {
						timeZone: n.timeZone ?? "UTC",
						calendar: "gregory",
						numberingSystem: "latn"
					}, t = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
						...e,
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
						hourCycle: "h23"
					}).formatToParts(o).map((e) => [e.type, e.value])), i = n.locale ?? "en-US", a = (t) => new Intl.DateTimeFormat(i, {
						...e,
						month: t
					}).format(o), s = (t) => new Intl.DateTimeFormat(i, {
						...e,
						weekday: t
					}).format(o), l = Number(t.hour), c = l % 12 || 12, u = (e) => String(e).padStart(2, "0"), d = {
						d: String(Number(t.day)),
						dd: t.day,
						ddd: s("short"),
						dddd: s("long"),
						M: String(Number(t.month)),
						MM: t.month,
						MMM: a("short"),
						MMMM: a("long"),
						yy: t.year.slice(-2),
						yyyy: t.year.padStart(4, "0"),
						H: String(l),
						HH: u(l),
						h: String(c),
						hh: u(c),
						m: String(Number(t.minute)),
						mm: t.minute,
						s: String(Number(t.second)),
						ss: t.second,
						"am/pm": l < 12 ? "am" : "pm",
						"AM/PM": l < 12 ? "AM" : "PM"
					};
					return r.map((e) => "literal" in e ? e.literal : d[e.token]).join("");
				} catch {
					return;
				}
			}(i, a, t.temporal);
			return void 0 === s ? Vc(n, "unresolved", o) : {
				status: "resolved",
				text: s,
				dependencies: o
			};
		}
		if ("bookmark" in e) {
			const r = [{
				kind: "REF" === e.type ? "bookmark-text" : "bookmark-page",
				name: e.bookmark
			}], o = "REF" === e.type ? t.bookmarkText?.(e.bookmark) : t.bookmarkPage?.(e.bookmark);
			return null === o ? {
				status: "error",
				reason: "missing-bookmark",
				text: "Error! Bookmark not defined.",
				dependencies: r
			} : "REF" === e.type && "string" == typeof o ? {
				status: "resolved",
				text: o,
				dependencies: r
			} : "number" == typeof o && Xc(o) ? {
				status: "resolved",
				text: String(o),
				dependencies: r
			} : Vc(n, "unresolved", r);
		}
		const o = Wc[e.type], i = [{ kind: o.dependency }], a = t[o.key];
		return Xc(a) ? {
			status: "resolved",
			text: _o(a, e.format),
			dependencies: i
		} : Vc(n, "unresolved", i);
	}
	function Yc(e, t) {
		return JSON.stringify([e, t]);
	}
	function Qc(e) {
		const t = [], n = [], r = (e, o) => {
			for (const i of e) if ("paragraph" === i.type) t.push(i), n.push(o);
			else for (const e of i.rows) for (const t of e.cells) r(t.blocks, "cell:" + t.id);
		};
		return Fe(e).forEach((e, t) => r(e.blocks, "body:" + t)), function(e, t, n) {
			const r = /* @__PURE__ */ new Map();
			if (new Set(e.map((e) => e.id)).size !== e.length) return r;
			if (e.some((e) => e.runs.some((e) => "opaque" === e.kind || "textBox" === e.kind))) return r;
			const o = Oc(e);
			if (o.diagnostics.length) return r;
			if (n && o.spans.some((e) => {
				if (!e.end) return !0;
				const t = n[e.begin.paragraphIndex];
				for (let r = e.begin.paragraphIndex; r <= e.end.paragraphIndex; r++) if (n[r] !== t) return !0;
				return !1;
			})) return r;
			const i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
			for (const u of o.spans) {
				if ("SEQ" !== Ao(u.code.map((e) => "instruction" === e.kind ? e.raw : "").join("")).command) continue;
				if (null !== u.parentIndex || !u.end || u.begin.paragraphIndex !== u.end.paragraphIndex) return r;
				const e = a.get(u.begin.paragraphIndex) ?? [];
				e.push(u), a.set(u.begin.paragraphIndex, e);
			}
			const s = Array.from({ length: 9 }, () => 0);
			let l = !1;
			const c = (e) => {
				if (void 0 !== e.style?.outlineLevel) return e.style.outlineLevel;
				let n = e.style?.styleId;
				const r = /* @__PURE__ */ new Set();
				for (; n;) {
					if (r.has(n)) return;
					r.add(n);
					const e = t?.[n];
					if (!e) {
						const e = /^heading\s*([1-9])$/i.exec(n);
						return e ? Number(e[1]) - 1 : "normal" === n.toLowerCase() || "caption" === n.toLowerCase() ? null : void 0;
					}
					if (void 0 !== e.paragraphStyle?.outlineLevel) return e.paragraphStyle.outlineLevel;
					n = e.basedOn;
				}
				return null;
			};
			for (const [u, d] of e.entries()) {
				const e = c(d);
				if (void 0 === e) l = !0;
				else if ("number" == typeof e && Number.isInteger(e) && e >= 0 && e < 9) for (let t = e; t < 9; t++) s[t]++;
				for (const t of a.get(u) ?? []) {
					const e = t.code.map((e) => "instruction" === e.kind ? e.raw : "").join(""), n = Ao(e).tokens[1]?.value.toLowerCase();
					if (!n) return /* @__PURE__ */ new Map();
					const o = Gc(e), a = i.get(n);
					if ("SEQ" !== o?.type || !t.separator || t.code.some((e) => "instruction" !== e.kind) || 1 !== t.result.length || "run" !== t.result[0]?.kind || "text" !== d.runs[t.result[0].point.runIndex]?.kind || d.runs.some((e) => e.revision || e.revisionRangeMarker || e.sdtWrappers?.length) || d.sdtWrappers?.length || d.numberingRevision) {
						i.set(n, {});
						continue;
					}
					const c = t.result[0].point.runIndex, u = void 0 === o.headingLevel ? void 0 : s[o.headingLevel - 1];
					let p;
					if (p = "reset" === o.operation ? o.reset : "repeat" === o.operation ? a?.value : void 0 !== o.headingLevel ? l || a && void 0 === a.value ? void 0 : a ? a.headingLevel !== o.headingLevel ? void 0 : a.headingGeneration !== u ? 1 : a.value + 1 : 1 : a ? void 0 === a.value ? void 0 : a.value + 1 : 1, void 0 === p || !Number.isSafeInteger(p) || p < 1 || p > 1e6) i.set(n, {});
					else {
						if (t.beginMarker.fieldLock) {
							const e = d.runs[c].text;
							if (Zc(o, { sequenceValue: p }, e).text !== e) {
								i.set(n, {});
								continue;
							}
						} else r.set(Yc(d.id, c), p);
						i.set(n, {
							value: p,
							headingLevel: "repeat" === o.operation ? a?.headingLevel : o.headingLevel,
							headingGeneration: "repeat" === o.operation ? a?.headingGeneration : u
						});
					}
				}
			}
			return r;
		}(t, e.styles, n);
	}
	function Kc(e) {
		if (!(t = e) || "caption" !== t.style?.styleId?.toLowerCase() || !t.runs.some((e) => {
			const t = function(e) {
				return "fieldInstruction" === e.kind ? e.fieldInstruction : void 0;
			}(e);
			return void 0 !== t && (/* @__PURE__ */ new RegExp("\\bSEQ\\s+Figure\\b", "i")).test(t);
		}) || e.sdtWrappers?.length || e.numberingRevision || e.runs.some((e) => e.revision || e.revisionRangeMarker || e.sdtWrappers?.length)) return;
		var t;
		const n = Oc([e]);
		if (n.diagnostics.length || 1 !== n.spans.length) return;
		const r = n.spans[0];
		if (null !== r.parentIndex || !r.end || !r.separator || r.code.some((e) => "instruction" !== e.kind) || 1 !== r.result.length || "run" !== r.result[0]?.kind) return;
		const o = Gc(r.code.map((e) => "instruction" === e.kind ? e.raw : "").join(""));
		if ("SEQ" !== o?.type || "figure" !== o.identifier) return;
		const i = r.result[0].point.runIndex;
		return "text" !== e.runs[i]?.kind || i <= r.separator.runIndex || i >= r.end.runIndex ? void 0 : {
			field: o,
			begin: r.begin.runIndex,
			end: r.end.runIndex,
			result: i,
			locked: !!r.beginMarker.fieldLock
		};
	}
	function Jc(e) {
		const t = Qc(e);
		if (!t.size) return e;
		let n = !1;
		const r = (e) => e.map((e) => {
			if ("paragraph" === e.type) {
				const r = function(e, t) {
					const n = Kc(e);
					if (!n || n.locked) return e;
					const r = t.get(Yc(e.id, n.result));
					if (void 0 === r) return e;
					const o = _o(r, n.field.format);
					return e.runs[n.result].text === o ? e : {
						...e,
						runs: e.runs.map((e, t) => t === n.result ? {
							...e,
							text: o
						} : e)
					};
				}(e, t);
				return r !== e && (n = !0), r;
			}
			let o = !1;
			const i = e.rows.map((e) => {
				let t = !1;
				const n = e.cells.map((e) => {
					const n = r(e.blocks);
					return n.some((t, n) => t !== e.blocks[n]) ? (t = !0, {
						...e,
						blocks: n
					}) : e;
				});
				return t ? (o = !0, {
					...e,
					cells: n
				}) : e;
			});
			return o ? {
				...e,
				rows: i
			} : e;
		}), o = Fe(e).map((e) => {
			const t = r(e.blocks);
			return t.some((t, n) => t !== e.blocks[n]) ? {
				...e,
				blocks: t
			} : e;
		});
		return n ? {
			...e,
			sections: o
		} : e;
	}
	const eu = {
		oasis: {
			accent: "0F766E",
			heading: "115E59",
			body: "1F2937"
		},
		office: {
			accent: "4472C4",
			heading: "2F5597",
			body: "1F2937"
		},
		facet: {
			accent: "8064A2",
			heading: "604A7B",
			body: "262626"
		},
		integral: {
			accent: "70AD47",
			heading: "548235",
			body: "1F2937"
		},
		ion: {
			accent: "ED7D31",
			heading: "C55A11",
			body: "262626"
		},
		retrospect: {
			accent: "5B9BD5",
			heading: "2F75B5",
			body: "1F2937"
		}
	};
	const tu = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", nu = (e, t) => Object.hasOwn(e.parts, t), ru = (e) => /^[A-Za-z0-9_.\-/]+$/.test(e) && !e.startsWith("/") && !e.split("/").some((e) => !e || "." === e || ".." === e), ou = (e) => /^[A-Za-z0-9_.\-/]+$/.test(e);
	function iu(e) {
		if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(e)) throw Error("Unsafe XML declaration");
		const t = new b.DOMParser({ onError: () => {
			throw Error("Malformed XML");
		} }).parseFromString(e, "application/xml").documentElement;
		if (!t) throw Error("Missing XML root");
		return t;
	}
	function au(e) {
		const t = [], n = [e];
		for (; n.length;) {
			const e = n.pop();
			t.push(e);
			for (const t of Array.from(e.childNodes)) 1 === t.nodeType && n.push(t);
		}
		return t;
	}
	function su(e, t) {
		const n = e.split("/").slice(0, -1), r = t.split("/");
		for (; n.length && r.length && n[0] === r[0];) n.shift(), r.shift();
		const o = "../".repeat(n.length) + r.join("/");
		if (S(e, o) !== t) throw Error("Cannot rebase target");
		return o;
	}
	function lu(e, t, n, r) {
		const o = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), s = [], l = /* @__PURE__ */ new Map();
		return _c(e, (e) => {
			for (const t of e.runs) {
				const e = t.styles?.link;
				if (e && !e.startsWith("#") && !l.has(e)) {
					const t = `rIdLink${s.length + 1}`;
					l.set(e, t), s.push({
						rId: t,
						href: e
					});
				}
				if ("textBox" !== t.kind || a.has(t.id) || (a.set(t.id, n.nextTextBoxDocPrId), n.nextTextBoxDocPrId += 1), "image" !== t.kind) continue;
				const c = n.nextImageId, u = `rIdImg${c}`, d = {
					rId: u,
					runId: t.id,
					cx: Math.round(t.image.width * ne),
					cy: Math.round(t.image.height * ne),
					alt: t.image.alt,
					crop: t.image.crop,
					cropShape: t.image.cropShape,
					cropFit: t.image.cropFit,
					fillMode: t.image.fillMode,
					border: t.image.border,
					rotation: t.image.rotation,
					flipH: t.image.flipH,
					flipV: t.image.flipV,
					transparency: t.image.transparency,
					floating: t.image.floating,
					wrapPolygon: t.image.wrapPolygon
				};
				if (t.image.linkedSrc) {
					o.push({
						...d,
						kind: "linked",
						target: t.image.linkedSrc
					}), i.set(t.id, u), n.nextImageId += 1;
					continue;
				}
				const p = Pe(r, t.image.src).match(/^data:([^;,]+);base64,(.*)$/);
				if (!p) continue;
				const f = pn(p[1]);
				if (!f) continue;
				const h = p[2], m = `media/image${c}.${f}`;
				o.push({
					...d,
					kind: "embedded",
					target: m,
					base64: h
				}), i.set(t.id, u), n.nextImageId += 1;
			}
		}), {
			authorizedOpaqueFragments: n.authorizedOpaqueFragments,
			numberingInfo: t.numberingInfo,
			definitions: t.definitions,
			images: o,
			imageMap: i,
			textBoxDocPrIds: a,
			hyperlinks: s,
			hyperlinkMap: l
		};
	}
	function cu(e, t, n) {
		n && (e.file(`word/${t}.xml`, n.xml), (n.partContext.images.length > 0 || n.partContext.hyperlinks.length > 0) && e.file(`word/_rels/${t}.xml.rels`, Tc(n.partContext.images, n.partContext.hyperlinks)));
	}
	async function uu(e, t) {
		const n = No(t), r = n.diagnostics.filter((e) => "error" === e.level);
		if (r.length) throw new Eo(r);
		const o = new Map(n.objects.map((e) => [e.fragmentXml, {
			signature: e.signature,
			kind: e.kind,
			relationshipIds: e.relationshipIds
		}])), i = e.opaqueRelocationIntent;
		if (!i) return du(e, o);
		const a = function(e, t, n) {
			if (t.ownerPath === n) throw Error("Same-story move does not need relationship relocation");
			if (!ru(t.ownerPath) || !ru(n) || !nu(e, n)) throw Error("Unknown or unsafe destination story");
			const r = No(e);
			if (r.diagnostics.some((e) => "error" === e.level)) throw Error("Opaque source inventory has errors");
			const o = r.objects.filter((e) => e.signature === t.signature), i = 1 === o.length ? o[0] : void 0;
			if (!i || i.ownerPath !== t.ownerPath || i.ordinal !== t.ordinal) throw Error("Ambiguous original object");
			const a = e.parts[n], s = e.parts[e.mainDocumentPart], l = (t) => {
				const n = e.parts[t];
				if (!n || "xml" !== n.kind) return !1;
				const r = iu(n.data);
				if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== r.namespaceURI) return !1;
				if (t === e.mainDocumentPart) return "document" === r.localName;
				const o = "hdr" === r.localName ? "header" : "ftr" === r.localName ? "footer" : void 0;
				return Boolean(o && n.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml." + o + "+xml" && s?.relationships?.some((e) => "External" !== e.targetMode && e.type === tu + "/" + o && e.resolvedTarget === t));
			};
			if (!l(i.ownerPath) || !l(n)) throw Error("Unsupported or unlinked story");
			if (i.partPaths.includes(n) || i.partPaths.includes(i.ownerPath)) throw Error("Story-dependent object closure");
			const c = iu(i.fragmentXml), u = iu(a.data), d = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", p = new Set(au(u).filter((e) => e.namespaceURI === d && "docPr" === e.localName).map((e) => e.getAttribute("id")));
			if (au(c).some((e) => e.namespaceURI === d && "docPr" === e.localName && p.has(e.getAttribute("id")))) throw Error("Destination drawing ID collision");
			const f = e.parts[i.ownerPath]?.relationships ?? [], h = a.relationships ?? [], m = new Set(h.map((e) => e.id));
			if (m.size !== h.length) throw Error("Duplicate destination relationship IDs");
			const g = au(u).flatMap((e) => Array.from(e.attributes).map((e) => e.value));
			let w = 1;
			const b = () => {
				let e;
				do
					e = "rIdOasisOpaque" + w++;
				while (m.has(e) || a.data.includes(e) || g.some((t) => t.includes(e)));
				return m.add(e), e;
			}, v = /* @__PURE__ */ new Map(), y = [];
			for (const k of i.relationshipIds) {
				const t = f.filter((e) => e.id === k), r = 1 === t.length ? t[0] : void 0;
				if (!(r && "External" !== r.targetMode && r.resolvedTarget && ou(r.target) && ru(r.resolvedTarget) && nu(e, r.resolvedTarget) && S(i.ownerPath, r.target) === r.resolvedTarget)) throw Error("Unsupported or ambiguous direct relationship " + k);
				const o = b();
				v.set(k, o), y.push({
					...r,
					id: o,
					target: su(n, r.resolvedTarget),
					targetMode: "Internal"
				});
			}
			const x = /* @__PURE__ */ new Set();
			for (const S of au(c)) for (const e of Array.from(S.attributes)) {
				const t = e.namespaceURI === tu || "http://purl.oclc.org/ooxml/officeDocument/relationships" === e.namespaceURI || "urn:schemas-microsoft-com:office:office" === e.namespaceURI && "relid" === e.localName, n = v.get(e.value);
				if (t && n) x.add(e.value), S.setAttributeNS(e.namespaceURI, e.name, n);
				else {
					if (!t && "http://www.w3.org/2000/xmlns/" !== e.namespaceURI && [...v.keys()].some((t) => e.value === t)) throw Error("Unknown attribute may carry a relationship reference");
					if (t && e.value && !n) throw Error("Unmapped relationship reference");
				}
			}
			if (x.size !== v.size) throw Error("Source relationship reference missing");
			const N = So(c);
			if (!N || N.objectKind !== i.kind) throw Error("Relocation changed object kind");
			const E = bo({
				...e,
				parts: {
					...e.parts,
					[n]: {
						...a,
						relationships: [...h, ...y]
					}
				}
			}, n, N.relationshipIds);
			if (E.issues.length || JSON.stringify(E.partPaths) !== JSON.stringify(i.partPaths)) throw Error("Relocated relationship closure differs");
			return {
				sourceOwner: i.ownerPath,
				destinationOwner: n,
				sourceOrdinal: i.ordinal,
				sourceSignature: i.signature,
				destinationRun: N,
				addedRelationships: y,
				idMapping: [...v].map(([e, t]) => ({
					from: e,
					to: t
				})),
				sharedPartPaths: [...i.partPaths]
			};
		}(t, i, i.destinationOwner).destinationRun;
		return du(e, new Map([...o, [a.fragmentXml, {
			signature: a.signature,
			kind: a.objectKind,
			relationshipIds: a.relationshipIds
		}]]));
	}
	async function du(e, t) {
		e = Jc(e);
		const n = new w.default(), r = $c(e), o = {
			authorizedOpaqueFragments: t,
			nextImageId: 1,
			nextTextBoxDocPrId: 1000001
		}, i = Fe(e), a = function(e) {
			const t = e.design?.watermark;
			if ("image" !== t?.kind || !t.src) return;
			const n = Pe(e, t.src).match(/^data:([^;,]+);base64,(.*)$/);
			if (!n) return;
			const r = pn(n[1]);
			return r ? {
				rId: "rIdWatermark",
				runId: "__watermark",
				kind: "embedded",
				target: `media/watermark.${r}`,
				base64: n[2],
				cx: 1,
				cy: 1
			} : void 0;
		}(e), s = cc(e), l = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const n of e) t.set(n.footnoteId, n.docxId);
			return t;
		}(s), c = s.length > 0, u = pc(e), d = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const n of e) t.set(n.endnoteId, n.docxId);
			return t;
		}(u), p = u.length > 0, f = function(e) {
			const t = e.bookmarks;
			if (!t || 0 === t.order.length) return;
			const n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
			for (const s of t.order) {
				const e = t.items[s];
				if (!e) continue;
				const o = e.docxIdHint;
				void 0 !== o && o >= 0 && !r.has(o) && (n.set(s, o), r.add(o));
			}
			let o = 0;
			for (const s of t.order) if (!n.has(s)) {
				for (; r.has(o);) o += 1;
				n.set(s, o), r.add(o), o += 1;
			}
			const i = /* @__PURE__ */ new Map(), a = (e, t) => {
				const n = i.get(e);
				n ? n.push(t) : i.set(e, [t]);
			};
			for (const s of t.order) {
				const e = t.items[s];
				if (!e) continue;
				const r = n.get(s);
				e.start && a(e.start.paragraphId, {
					kind: "start",
					offset: e.start.offset,
					seq: e.start.seq ?? 0,
					wId: r,
					name: e.name,
					...void 0 !== e.colFirst ? { colFirst: e.colFirst } : {},
					...void 0 !== e.colLast ? { colLast: e.colLast } : {}
				}), e.end && a(e.end.paragraphId, {
					kind: "end",
					offset: e.end.offset,
					seq: e.end.seq ?? 0,
					wId: r
				});
			}
			return i;
		}(e), h = function(e) {
			const t = e.comments;
			if (!t || 0 === t.order.length) return;
			const n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
			for (const l of t.order) {
				const e = t.items[l];
				if (!e) continue;
				const o = e.docxIdHint;
				void 0 !== o && o >= 0 && !r.has(o) && (n.set(l, o), r.add(o));
			}
			let o = 0;
			for (const l of t.order) if (!n.has(l)) {
				for (; r.has(o);) o += 1;
				n.set(l, o), r.add(o), o += 1;
			}
			const i = /* @__PURE__ */ new Map(), a = (e, t) => {
				const n = i.get(e);
				n ? n.push(t) : i.set(e, [t]);
			}, s = [];
			return t.order.forEach((e, r) => {
				const o = t.items[e];
				if (!o) return;
				const i = n.get(e), l = (1073741824 + r).toString(16).toUpperCase();
				s.push({
					comment: o,
					wId: i,
					paraId: l
				}), o.start && a(o.start.paragraphId, {
					kind: "start",
					offset: o.start.offset,
					seq: o.start.seq ?? 0,
					wId: i
				}), o.end && (a(o.end.paragraphId, {
					kind: "end",
					offset: o.end.offset,
					seq: o.end.seq ?? 0,
					wId: i
				}), a(o.end.paragraphId, {
					kind: "reference",
					offset: o.end.offset,
					seq: (o.end.seq ?? 0) + .5,
					wId: i
				}));
			}), {
				eventsByParagraph: i,
				comments: s
			};
		}(e), m = (e) => (e.footnoteIdMap = l, e.endnoteIdMap = d, e.bookmarkEventsByParagraph = f, e.commentEventsByParagraph = h?.eventsByParagraph, e), g = m(lu(i.flatMap((e) => e.blocks), r, o, e)), b = void 0 !== h, v = [], y = i.map(() => ({}));
		let x = 1, S = 1;
		i.forEach((t, n) => {
			const i = (t, i, s) => {
				if (!(s && 0 !== s.length || "header" === t && "text" === e.design?.watermark?.kind || "header" === t && void 0 !== a)) return;
				const l = s ?? [], c = "header" === t ? x : S, u = `${t}${c}.xml`, d = `rId${"header" === t ? "Header" : "Footer"}${c}`, p = m(lu(l, r, o, e));
				"header" === t && a && p.images.push({ ...a }), v.push({
					kind: t,
					type: i,
					path: u,
					relId: d,
					blocks: l,
					context: p
				});
				const f = "header" === t ? "header" : "footer";
				(y[n][f] ??= {})[i] = { relId: d }, "header" === t ? x += 1 : S += 1;
			};
			i("header", "first", t.firstPageHeader), i("header", "even", t.evenPageHeader), i("header", "default", t.header), i("footer", "first", t.firstPageFooter), i("footer", "even", t.evenPageFooter), i("footer", "default", t.footer);
		});
		const N = r.definitions.length > 0, E = i.some((e) => (e.evenPageHeader?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0), k = E || void 0 !== e.settings?.defaultTabStop || void 0 !== e.settings?.allowSpaceOfSameStyleInTable || void 0 !== e.settings?.autoHyphenation || void 0 !== e.settings?.consecutiveHyphenLimit || void 0 !== e.settings?.hyphenationZone || void 0 !== e.settings?.doNotHyphenateCaps || void 0 !== e.footnotes?.settings || void 0 !== e.endnotes?.settings || void 0 !== e.documentVariables && Object.keys(e.documentVariables).length > 0, T = [...g.images, ...v.flatMap((e) => e.context.images)], I = c ? function(e, t, n, r, o, i, a) {
			const s = o(t.flatMap((e) => uc(e.footnote.blocks)));
			s.footnoteIdMap = a;
			const l = t.map((e) => {
				const t = sc(uc(e.footnote.blocks), s, i);
				return `<w:footnote w:id="${e.docxId}">${t}</w:footnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${Vn}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${l}</w:footnotes>`,
				partContext: s
			};
		}(0, s, 0, 0, (t) => lu(t, r, o, e), e.styles, l) : null;
		I && T.push(...I.partContext.images);
		const _ = p ? function(e, t, n, r, o, i, a) {
			const s = o(t.flatMap((e) => fc(e.endnote.blocks)));
			s.endnoteIdMap = a;
			const l = t.map((e) => {
				const t = sc(fc(e.endnote.blocks), s, i);
				return `<w:endnote w:id="${e.docxId}">${t}</w:endnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:endnotes xmlns:w="${Wn}" xmlns:w14="${Xn}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${Vn}"><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote><w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>${l}</w:endnotes>`,
				partContext: s
			};
		}(0, u, 0, 0, (t) => lu(t, r, o, e), e.styles, d) : null;
		_ && T.push(..._.partContext.images);
		const C = T.filter((e) => "embedded" === e.kind).map((e) => e.target.split(".").pop()?.toLowerCase()).filter((e) => Boolean(e)), A = null != e.styles && Object.keys(e.styles).length > 0, R = (e.fontTable?.length ?? 0) > 0, $ = void 0 !== e.design;
		n.file("[Content_Types].xml", xc(N, C, k, v, c, p, A, b, R, $)), n.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${Gn}"><Relationship Id="rId1" Type="${Vn}/officeDocument" Target="word/document.xml"/></Relationships>`), n.file("word/document.xml", Mc(e, g, y)), A && n.file("word/styles.xml", yc(e.styles, r.styleNumbering)), N && n.file("word/numbering.xml", function(e) {
			const t = e.map(({ abstractNumId: e, levels: t }) => {
				const n = t.sort((e, t) => e.level - t.level).map(({ kind: e, level: t, format: n, startAt: r, levelText: o, suffix: i, alignment: a, legal: s, bulletGlyph: l, bulletFont: c, ooxml: u }) => {
					const d = "bullet" === e ? "bullet" : u?.format ?? n ?? "decimal", p = o ?? ("bullet" === e ? l ?? "" : `%${t + 1}.`), f = r ?? 1, h = "bullet" === e ? c ?? "Symbol" : void 0, m = h ? `<w:rPr><w:rFonts w:ascii="${Zn(h)}" w:hAnsi="${Zn(h)}" w:hint="default"/></w:rPr>` : "", g = i && "tab" !== i ? `<w:suff w:val="${i}"/>` : "", w = s ? "<w:isLgl/>" : "", b = void 0 !== u?.restartAfterLevel ? `<w:lvlRestart w:val="${u.restartAfterLevel}"/>` : "", v = u?.paragraphStyleId ? `<w:pStyle w:val="${Zn(u.paragraphStyleId)}"/>` : "";
					return `<w:lvl w:ilvl="${t}"><w:start w:val="${f}"/><w:numFmt w:val="${Zn(d)}"/>${b}${v}<w:lvlText w:val="${Zn(p)}"/><w:lvlJc w:val="${a ?? "left"}"/>${g}${w}${m}</w:lvl>`;
				}).join(""), r = t[0]?.ooxml;
				return `<w:abstractNum w:abstractNumId="${e}">${[r?.styleLink ? `<w:styleLink w:val="${Zn(r.styleLink)}"/>` : "", r?.numStyleLink ? `<w:numStyleLink w:val="${Zn(r.numStyleLink)}"/>` : ""].join("")}${n}</w:abstractNum>`;
			}).join(""), n = e.map(({ abstractNumId: e, numId: t }) => `<w:num w:numId="${t}"><w:abstractNumId w:val="${e}"/></w:num>`).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${Wn}">${t}${n}</w:numbering>`;
		}(r.definitions)), (A || N || k || g.images.length > 0 || g.hyperlinks.length > 0 || v.length > 0 || c || p || b || R || $) && n.file("word/_rels/document.xml.rels", function(e, t, n, r, o, i, a, s, l, c, u = !1) {
			let d = "";
			s && (d += `<Relationship Id="rIdStyles" Type="${Vn}/styles" Target="styles.xml"/>`), e && (d += `<Relationship Id="rIdNum" Type="${Vn}/numbering" Target="numbering.xml"/>`), t && (d += `<Relationship Id="rIdSettings" Type="${Vn}/settings" Target="settings.xml"/>`);
			for (const p of r) d += `<Relationship Id="${p.rId}" Type="${Vn}/hyperlink" Target="${Zn(p.href)}" TargetMode="External"/>`;
			for (const p of n) {
				const e = "linked" === p.kind ? " TargetMode=\"External\"" : "";
				d += `<Relationship Id="${p.rId}" Type="${Vn}/image" Target="${Zn(p.target)}"${e}/>`;
			}
			for (const p of o) {
				const e = "header" === p.kind ? "header" : "footer";
				d += `<Relationship Id="${p.relId}" Type="${Vn}/${e}" Target="${p.path}"/>`;
			}
			return i && (d += `<Relationship Id="rIdFootnotes" Type="${Vn}/footnotes" Target="footnotes.xml"/>`), a && (d += `<Relationship Id="rIdEndnotes" Type="${Vn}/endnotes" Target="endnotes.xml"/>`), l && (d += `<Relationship Id="rIdComments" Type="${Vn}/comments" Target="comments.xml"/>`, d += "<Relationship Id=\"rIdCommentsExtended\" Type=\"http://schemas.microsoft.com/office/2011/relationships/commentsExtended\" Target=\"commentsExtended.xml\"/>"), c && (d += `<Relationship Id="rIdFontTable" Type="${Vn}/fontTable" Target="fontTable.xml"/>`), u && (d += `<Relationship Id="rIdTheme" Type="${Vn}/theme" Target="theme/theme1.xml"/>`), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${Gn}">${d}</Relationships>`;
		}(N, k, g.images, g.hyperlinks, v, c, p, A, b, R, $)), R && n.file("word/fontTable.xml", function(e) {
			const t = e.map((e) => {
				const t = [];
				if (e.altName && t.push(`<w:altName w:val="${Zn(e.altName)}"/>`), e.panose1 && t.push(`<w:panose1 w:val="${Zn(e.panose1)}"/>`), e.charset && t.push(`<w:charset w:val="${Zn(e.charset)}"/>`), e.family && t.push(`<w:family w:val="${Zn(e.family)}"/>`), e.pitch && t.push(`<w:pitch w:val="${Zn(e.pitch)}"/>`), e.sig) {
					const n = Object.entries(e.sig).map(([e, t]) => `w:${e}="${Zn(t)}"`).join(" ");
					n && t.push(`<w:sig ${n}/>`);
				}
				return `<w:font w:name="${Zn(e.name)}">${t.join("")}</w:font>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="${Wn}">${t}</w:fonts>`;
		}(e.fontTable)), $ && n.file("word/theme/theme1.xml", function(e) {
			const t = e?.themeData?.sourceXml;
			if (t) return t;
			const n = eu[e?.themeId ?? "oasis"] ?? eu.oasis, r = e?.themeData, o = (e, t) => (r?.colors?.[e] ?? t).replace(/^#/, "").toUpperCase(), i = {
				dk1: o("dk1", "000000"),
				lt1: o("lt1", "FFFFFF"),
				dk2: o("dk2", n.body),
				lt2: o("lt2", "FFFFFF"),
				accent1: o("accent1", n.accent),
				accent2: o("accent2", n.heading),
				accent3: o("accent3", "5B9BD5"),
				accent4: o("accent4", "70AD47"),
				accent5: o("accent5", "ED7D31"),
				accent6: o("accent6", "A5A5A5"),
				hlink: o("hlink", "0563C1"),
				folHlink: o("folHlink", "954F72")
			}, a = Object.entries(i).map(([e, t]) => `<a:${e}><a:srgbClr val="${t}"/></a:${e}>`).join(""), s = (e, t, n) => Zn(r?.fonts?.[e]?.[t] ?? n), l = Zn(r?.name ?? `${(e?.themeId ?? "oasis")[0].toUpperCase()}${(e?.themeId ?? "oasis").slice(1)}`), c = r?.effectsXml ?? "<a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/>";
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${l}"><a:themeElements><a:clrScheme name="${l}">${a}</a:clrScheme><a:fontScheme name="${l}"><a:majorFont><a:latin typeface="${s("major", "majorHAnsi", "Aptos Display")}"/><a:ea typeface="${s("major", "majorEastAsia", "Aptos Display")}"/><a:cs typeface="${s("major", "majorBidi", "Aptos Display")}"/></a:majorFont><a:minorFont><a:latin typeface="${s("minor", "minorHAnsi", "Aptos")}"/><a:ea typeface="${s("minor", "minorEastAsia", "Aptos")}"/><a:cs typeface="${s("minor", "minorBidi", "Aptos")}"/></a:minorFont></a:fontScheme><a:fmtScheme name="${l}">${c}</a:fmtScheme></a:themeElements></a:theme>`;
		}(e.design)), k && n.file("word/settings.xml", kc(E, e.settings?.defaultTabStop, e.footnotes?.settings, e.endnotes?.settings, e.settings?.allowSpaceOfSameStyleInTable, {
			autoHyphenation: e.settings?.autoHyphenation,
			consecutiveHyphenLimit: e.settings?.consecutiveHyphenLimit,
			hyphenationZone: e.settings?.hyphenationZone,
			doNotHyphenateCaps: e.settings?.doNotHyphenateCaps
		}, e.documentVariables));
		for (const w of v) n.file(`word/${w.path}`, Fc(w.kind, w.blocks, w.context, e.styles, e.design?.watermark)), (w.context.images.length > 0 || w.context.hyperlinks.length > 0) && n.file(`word/_rels/${w.path}.rels`, Tc(w.context.images, w.context.hyperlinks));
		cu(n, "footnotes", I), cu(n, "endnotes", _), h && (n.file("word/comments.xml", Aa(h)), n.file("word/commentsExtended.xml", function(e) {
			const t = new Map(e.comments.map(({ comment: e, paraId: t }) => [e.id, t])), n = e.comments.map(({ comment: e, paraId: n }) => {
				const r = e.parentId ? t.get(e.parentId) : void 0;
				return `<w15:commentEx w15:paraId="${n}"${r ? ` w15:paraIdParent="${r}"` : ""} w15:done="${e.resolved ? "1" : "0"}"/>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w15:commentsEx ${Ca}>${n}</w15:commentsEx>`;
		}(h)));
		for (const w of T) "embedded" === w.kind && w.base64 && n.file(`word/${w.target}`, w.base64, { base64: !0 });
		return n.generateAsync({ type: "arraybuffer" });
	}
	function pu(e) {
		let t = 2166136261;
		for (const n of e) t ^= n, t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	async function fu(e, t) {
		return async function(e) {
			const t = await w.default.loadAsync(e), n = {};
			for (const [r, o] of Object.entries(t.files)) o.dir || (n[x(r)] = pu(await o.async("uint8array")));
			return n;
		}(await uu(e, t));
	}
	const hu = "word/document.xml";
	function mu(e) {
		let t = 2166136261;
		for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	function gu(e, t) {
		const n = t.overrides[e];
		if (n) return n;
		const r = e.includes(".") ? e.slice(e.lastIndexOf(".") + 1).toLowerCase() : "";
		return t.defaults[r];
	}
	function wu(e, t) {
		return !(!e.endsWith(".xml") && !e.endsWith(".rels")) || "application/xml" === t || Boolean(t?.endsWith("+xml"));
	}
	async function bu(e) {
		const t = await w.default.loadAsync(e), n = [], r = await t.file("[Content_Types].xml")?.async("string"), o = function(e) {
			const t = {
				defaults: {},
				overrides: {}
			};
			if (!e) return t;
			const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!n) return t;
			for (let r = 0; r < n.childNodes.length; r += 1) {
				const e = n.childNodes[r];
				if (e?.nodeType !== e.ELEMENT_NODE) continue;
				const o = e;
				if ("Default" === o.localName) {
					const e = o.getAttribute("Extension")?.toLowerCase(), n = o.getAttribute("ContentType");
					e && n && (t.defaults[e] = n);
				} else if ("Override" === o.localName) {
					const e = o.getAttribute("PartName"), n = o.getAttribute("ContentType");
					e && n && (t.overrides[x(e)] = n);
				}
			}
			return t;
		}(r);
		r || n.push({
			level: "warning",
			code: "missing-content-types",
			message: "The DOCX package does not contain [Content_Types].xml."
		});
		const i = {};
		for (const [u, d] of Object.entries(t.files)) {
			if (d.dir) continue;
			const e = x(u), t = gu(e, o), n = wu(e, t) ? "xml" : "binary", r = "xml" === n ? await d.async("string") : await d.async("base64");
			i[e] = {
				path: e,
				...t ? { contentType: t } : {},
				kind: n,
				data: r,
				encoding: "xml" === n ? "utf8" : "base64",
				originalHash: mu(r)
			};
		}
		let a = [];
		for (const [u, d] of Object.entries(i)) {
			const e = N(u);
			if (void 0 === e || "xml" !== d.kind) continue;
			const t = T(e, E(d.data), (t) => {
				n.push({
					level: "warning",
					code: "unsafe-relationship-target",
					message: `Relationship ${t.id} points outside the OPC package.`,
					...e ? { partPath: e } : {},
					relationshipId: t.id
				});
			});
			if (null === e) {
				a = t;
				continue;
			}
			const r = i[e];
			r ? r.relationships = t : n.push({
				level: "warning",
				code: "orphan-relationships-part",
				message: `Relationship part ${u} has no owning package part.`,
				partPath: u
			});
		}
		let s = a.find((e) => "External" !== e.targetMode && e.type.endsWith("/officeDocument"))?.resolvedTarget;
		if (!s || !i[s]) {
			if (!i[hu]) throw new Error("DOCX package has no resolvable officeDocument relationship or word/document.xml fallback.");
			s = hu, n.push({
				level: "warning",
				code: "main-document-fallback",
				message: "The officeDocument relationship was absent or invalid; word/document.xml was used as a compatibility fallback."
			});
		}
		const l = {
			format: "docx",
			mainDocumentPart: s,
			contentTypes: o,
			rootRelationships: a,
			parts: i,
			...n.length > 0 ? { diagnostics: n } : {}
		}, c = No(l);
		return c.objects.length && (l.opaqueObjects = c.objects), c.diagnostics.length && (l.diagnostics = [...n, ...c.diagnostics]), l;
	}
	const vu = "word/document.xml", yu = {
		"/styles": "word/styles.xml",
		"/numbering": "word/numbering.xml",
		"/settings": "word/settings.xml",
		"/fontTable": "word/fontTable.xml",
		"/theme": "word/theme/theme1.xml",
		"/footnotes": "word/footnotes.xml",
		"/endnotes": "word/endnotes.xml",
		"/comments": "word/comments.xml",
		"/commentsExtended": "word/commentsExtended.xml"
	};
	function xu(e) {
		const t = e.lastIndexOf("/"), n = t >= 0 ? e.slice(0, t) : "", r = t >= 0 ? e.slice(t + 1) : e;
		return n ? `${n}/_rels/${r}.rels` : `_rels/${r}.rels`;
	}
	function Su(e, t, n) {
		"base64" === n.encoding ? e.file(t, n.data, { base64: !0 }) : e.file(t, n.data);
	}
	function Nu(e) {
		return `word/__oasis_source__/${e}`;
	}
	function Eu(e) {
		return e ? e.map((e) => "External" !== e.targetMode && e.resolvedTarget ? {
			...e,
			target: `/${Nu(e.resolvedTarget)}`,
			resolvedTarget: void 0
		} : e) : [];
	}
	function ku(e) {
		for (const [t, n] of Object.entries(yu)) if (e.type.endsWith(t)) return n;
	}
	async function Tu(e, t) {
		if (!function(e) {
			if (e.mainDocumentPart !== vu) return !0;
			const t = e.parts[e.mainDocumentPart];
			return Boolean(t?.relationships?.some((e) => {
				const t = ku(e);
				return Boolean(t && e.resolvedTarget && e.resolvedTarget !== t);
			}));
		}(t)) return e;
		const n = new w.default();
		for (const i of Object.values(t.parts)) Su(n, i.path, i);
		for (const i of Object.values(t.parts)) {
			if (i.path.endsWith(".rels") || "[Content_Types].xml" === i.path) continue;
			const e = Nu(i.path);
			Su(n, e, i);
			const t = Eu(i.relationships);
			t.length > 0 && n.file(xu(e), k(t));
		}
		const r = t.parts[t.mainDocumentPart];
		if (!r) throw new Error(`DOCX source package is missing its main part: ${t.mainDocumentPart}`);
		Su(n, vu, r);
		const o = Eu(r.relationships);
		o.length > 0 && n.file(xu(vu), k(o));
		for (const i of r.relationships ?? []) {
			if ("External" === i.targetMode || !i.resolvedTarget) continue;
			const e = ku(i), r = t.parts[i.resolvedTarget];
			if (!e || !r) continue;
			Su(n, e, r);
			const o = Eu(r.relationships);
			o.length > 0 && n.file(xu(e), k(o));
		}
		return n.generateAsync({ type: "arraybuffer" });
	}
	function Iu(e) {
		globalThis.postMessage(e);
	}
	globalThis.addEventListener("message", async (e) => {
		const t = e.data;
		if ("import-docx" === t?.type) try {
			const e = await bu(t.buffer), r = await ka(await Tu(t.buffer, e), { onProgress: (e, n) => {
				Iu({
					type: "progress",
					id: t.id,
					stage: e,
					progress: n
				});
			} });
			await async function(e, t) {
				try {
					t.rebuiltPartHashes = await fu(e, t);
				} catch (n) {
					(t.diagnostics ??= []).push({
						level: "warning",
						code: "rebuilt-baseline-unavailable",
						message: `The imported document could not be fingerprinted for granular source-part preservation: ${n instanceof Error ? n.message : String(n)}`
					});
				}
			}(r, e), r.sourcePackage = e, Iu({
				type: "done",
				id: t.id,
				document: r
			});
		} catch (n) {
			Iu({
				type: "error",
				id: t.id,
				error: n instanceof Error ? n.message : String(n)
			});
		}
	});
})();
