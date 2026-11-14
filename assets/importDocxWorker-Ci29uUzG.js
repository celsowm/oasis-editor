(function() {
	var e = Object.create, t = Object.defineProperty, r = Object.getOwnPropertyDescriptor, n = Object.getOwnPropertyNames, o = Object.getPrototypeOf, i = Object.prototype.hasOwnProperty, a = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (a, s, l) => (l = null != a ? e(o(a)) : {}, ((e, o, a, s) => {
		if (o && "object" == typeof o || "function" == typeof o) for (var l, c = n(o), u = 0, d = c.length; u < d; u++) l = c[u], i.call(e, l) || l === a || t(e, l, {
			get: ((e) => o[e]).bind(null, l),
			enumerable: !(s = r(o, l)) || s.enumerable
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
		(function(r) {
			"object" == typeof e && void 0 !== t ? t.exports = r() : "function" == typeof define && define.amd ? define([], r) : ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = r();
		})(function() {
			return function e(t, r, n) {
				function o(a, s) {
					if (!r[a]) {
						if (!t[a]) {
							var l = "function" == typeof require && require;
							if (!s && l) return l(a, !0);
							if (i) return i(a, !0);
							var c = /* @__PURE__ */ new Error("Cannot find module '" + a + "'");
							throw c.code = "MODULE_NOT_FOUND", c;
						}
						var u = r[a] = { exports: {} };
						t[a][0].call(u.exports, function(e) {
							return o(t[a][1][e] || e);
						}, u, u.exports, e, t, r, n);
					}
					return r[a].exports;
				}
				for (var i = "function" == typeof require && require, a = 0; a < n.length; a++) o(n[a]);
				return o;
			}({
				1: [function(e, t, r) {
					"use strict";
					var n = e("./utils"), o = e("./support"), i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
					r.encode = function(e) {
						for (var t, r, o, a, s, l, c, u = [], d = 0, p = e.length, f = p, h = "string" !== n.getTypeOf(e); d < e.length;) f = p - d, o = h ? (t = e[d++], r = d < p ? e[d++] : 0, d < p ? e[d++] : 0) : (t = e.charCodeAt(d++), r = d < p ? e.charCodeAt(d++) : 0, d < p ? e.charCodeAt(d++) : 0), a = t >> 2, s = (3 & t) << 4 | r >> 4, l = 1 < f ? (15 & r) << 2 | o >> 6 : 64, c = 2 < f ? 63 & o : 64, u.push(i.charAt(a) + i.charAt(s) + i.charAt(l) + i.charAt(c));
						return u.join("");
					}, r.decode = function(e) {
						var t, r, n, a, s, l, c = 0, u = 0;
						if (e.substr(0, 5) === "data:") throw new Error("Invalid base64 input, it looks like a data url.");
						var p, f = 3 * (e = e.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
						if (e.charAt(e.length - 1) === i.charAt(64) && f--, e.charAt(e.length - 2) === i.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
						for (p = o.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); c < e.length;) t = i.indexOf(e.charAt(c++)) << 2 | (a = i.indexOf(e.charAt(c++))) >> 4, r = (15 & a) << 4 | (s = i.indexOf(e.charAt(c++))) >> 2, n = (3 & s) << 6 | (l = i.indexOf(e.charAt(c++))), p[u++] = t, 64 !== s && (p[u++] = r), 64 !== l && (p[u++] = n);
						return p;
					};
				}, {
					"./support": 30,
					"./utils": 32
				}],
				2: [function(e, t, r) {
					"use strict";
					var n = e("./external"), o = e("./stream/DataWorker"), i = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
					function s(e, t, r, n, o) {
						this.compressedSize = e, this.uncompressedSize = t, this.crc32 = r, this.compression = n, this.compressedContent = o;
					}
					s.prototype = {
						getContentWorker: function() {
							var e = new o(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t = this;
							return e.on("end", function() {
								if (this.streamInfo.data_length !== t.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
							}), e;
						},
						getCompressedWorker: function() {
							return new o(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
						}
					}, s.createWorkerFrom = function(e, t, r) {
						return e.pipe(new i()).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression", t);
					}, t.exports = s;
				}, {
					"./external": 6,
					"./stream/Crc32Probe": 25,
					"./stream/DataLengthProbe": 26,
					"./stream/DataWorker": 27
				}],
				3: [function(e, t, r) {
					"use strict";
					var n = e("./stream/GenericWorker");
					r.STORE = {
						magic: "\0\0",
						compressWorker: function() {
							return new n("STORE compression");
						},
						uncompressWorker: function() {
							return new n("STORE decompression");
						}
					}, r.DEFLATE = e("./flate");
				}, {
					"./flate": 7,
					"./stream/GenericWorker": 28
				}],
				4: [function(e, t, r) {
					"use strict";
					var n = e("./utils"), o = function() {
						for (var e, t = [], r = 0; r < 256; r++) {
							e = r;
							for (var n = 0; n < 8; n++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
							t[r] = e;
						}
						return t;
					}();
					t.exports = function(e, t) {
						return void 0 !== e && e.length ? "string" !== n.getTypeOf(e) ? function(e, t, r) {
							var n = o, i = 0 + r;
							e ^= -1;
							for (var a = 0; a < i; a++) e = e >>> 8 ^ n[255 & (e ^ t[a])];
							return -1 ^ e;
						}(0 | t, e, e.length) : function(e, t, r) {
							var n = o, i = 0 + r;
							e ^= -1;
							for (var a = 0; a < i; a++) e = e >>> 8 ^ n[255 & (e ^ t.charCodeAt(a))];
							return -1 ^ e;
						}(0 | t, e, e.length) : 0;
					};
				}, { "./utils": 32 }],
				5: [function(e, t, r) {
					"use strict";
					r.base64 = !1, r.binary = !1, r.dir = !1, r.createFolders = !0, r.date = null, r.compression = null, r.compressionOptions = null, r.comment = null, r.unixPermissions = null, r.dosPermissions = null;
				}, {}],
				6: [function(e, t, r) {
					"use strict";
					t.exports = { Promise: "undefined" != typeof Promise ? Promise : e("lie") };
				}, { lie: 37 }],
				7: [function(e, t, r) {
					"use strict";
					var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, o = e("pako"), i = e("./utils"), a = e("./stream/GenericWorker"), s = n ? "uint8array" : "array";
					function l(e, t) {
						a.call(this, "FlateWorker/" + e), this._pako = null, this._pakoAction = e, this._pakoOptions = t, this.meta = {};
					}
					r.magic = "\b\0", i.inherits(l, a), l.prototype.processChunk = function(e) {
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
					}, r.compressWorker = function(e) {
						return new l("Deflate", e);
					}, r.uncompressWorker = function() {
						return new l("Inflate", {});
					};
				}, {
					"./stream/GenericWorker": 28,
					"./utils": 32,
					pako: 38
				}],
				8: [function(e, t, r) {
					"use strict";
					function n(e, t) {
						var r, n = "";
						for (r = 0; r < t; r++) n += String.fromCharCode(255 & e), e >>>= 8;
						return n;
					}
					function o(e, t, r, o, a, u) {
						var d, p, f = e.file, h = e.compression, m = u !== s.utf8encode, g = i.transformTo("string", u(f.name)), w = i.transformTo("string", s.utf8encode(f.name)), b = f.comment, v = i.transformTo("string", u(b)), y = i.transformTo("string", s.utf8encode(b)), x = w.length !== f.name.length, E = y.length !== b.length, S = "", N = "", k = "", _ = f.dir, T = f.date, I = {
							crc32: 0,
							compressedSize: 0,
							uncompressedSize: 0
						};
						t && !r || (I.crc32 = e.crc32, I.compressedSize = e.compressedSize, I.uncompressedSize = e.uncompressedSize);
						var A = 0;
						t && (A |= 8), m || !x && !E || (A |= 2048);
						var C = 0, R = 0;
						_ && (C |= 16), "UNIX" === a ? (R = 798, C |= function(e, t) {
							var r = e;
							return e || (r = t ? 16893 : 33204), (65535 & r) << 16;
						}(f.unixPermissions, _)) : (R = 20, C |= function(e) {
							return 63 & (e || 0);
						}(f.dosPermissions)), d = T.getUTCHours(), d <<= 6, d |= T.getUTCMinutes(), d <<= 5, d |= T.getUTCSeconds() / 2, p = T.getUTCFullYear() - 1980, p <<= 4, p |= T.getUTCMonth() + 1, p <<= 5, p |= T.getUTCDate(), x && (N = n(1, 1) + n(l(g), 4) + w, S += "up" + n(N.length, 2) + N), E && (k = n(1, 1) + n(l(v), 4) + y, S += "uc" + n(k.length, 2) + k);
						var $ = "";
						return $ += "\n\0", $ += n(A, 2), $ += h.magic, $ += n(d, 2), $ += n(p, 2), $ += n(I.crc32, 4), $ += n(I.compressedSize, 4), $ += n(I.uncompressedSize, 4), $ += n(g.length, 2), $ += n(S.length, 2), {
							fileRecord: c.LOCAL_FILE_HEADER + $ + g + S,
							dirRecord: c.CENTRAL_FILE_HEADER + n(R, 2) + $ + n(v.length, 2) + "\0\0\0\0" + n(C, 4) + n(o, 4) + g + S + v
						};
					}
					var i = e("../utils"), a = e("../stream/GenericWorker"), s = e("../utf8"), l = e("../crc32"), c = e("../signature");
					function u(e, t, r, n) {
						a.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t, this.zipPlatform = r, this.encodeFileName = n, this.streamFiles = e, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
					}
					i.inherits(u, a), u.prototype.push = function(e) {
						var t = e.meta.percent || 0, r = this.entriesCount, n = this._sources.length;
						this.accumulate ? this.contentBuffer.push(e) : (this.bytesWritten += e.data.length, a.prototype.push.call(this, {
							data: e.data,
							meta: {
								currentFile: this.currentFile,
								percent: r ? (t + 100 * (r - n - 1)) / r : 100
							}
						}));
					}, u.prototype.openedSource = function(e) {
						this.currentSourceOffset = this.bytesWritten, this.currentFile = e.file.name;
						var t = this.streamFiles && !e.file.dir;
						if (t) {
							var r = o(e, t, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
							this.push({
								data: r.fileRecord,
								meta: { percent: 0 }
							});
						} else this.accumulate = !0;
					}, u.prototype.closedSource = function(e) {
						this.accumulate = !1;
						var t = this.streamFiles && !e.file.dir, r = o(e, t, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
						if (this.dirRecords.push(r.dirRecord), t) this.push({
							data: function(e) {
								return c.DATA_DESCRIPTOR + n(e.crc32, 4) + n(e.compressedSize, 4) + n(e.uncompressedSize, 4);
							}(e),
							meta: { percent: 100 }
						});
						else for (this.push({
							data: r.fileRecord,
							meta: { percent: 0 }
						}); this.contentBuffer.length;) this.push(this.contentBuffer.shift());
						this.currentFile = null;
					}, u.prototype.flush = function() {
						for (var e = this.bytesWritten, t = 0; t < this.dirRecords.length; t++) this.push({
							data: this.dirRecords[t],
							meta: { percent: 100 }
						});
						var r = this.bytesWritten - e, o = function(e, t, r, o, a) {
							var s = i.transformTo("string", a(o));
							return c.CENTRAL_DIRECTORY_END + "\0\0\0\0" + n(e, 2) + n(e, 2) + n(t, 4) + n(r, 4) + n(s.length, 2) + s;
						}(this.dirRecords.length, r, e, this.zipComment, this.encodeFileName);
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
						for (var r = 0; r < t.length; r++) try {
							t[r].error(e);
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
				9: [function(e, t, r) {
					"use strict";
					var n = e("../compressions"), o = e("./ZipFileWorker");
					r.generateWorker = function(e, t, r) {
						var i = new o(t.streamFiles, r, t.platform, t.encodeFileName), a = 0;
						try {
							e.forEach(function(e, r) {
								a++;
								var o = function(e, t) {
									var r = e || t, o = n[r];
									if (!o) throw new Error(r + " is not a valid compression method !");
									return o;
								}(r.options.compression, t.compression), s = r.options.compressionOptions || t.compressionOptions || {}, l = r.dir, c = r.date;
								r._compressWorker(o, s).withStreamInfo("file", {
									name: e,
									dir: l,
									date: c,
									comment: r.comment || "",
									unixPermissions: r.unixPermissions,
									dosPermissions: r.dosPermissions
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
				10: [function(e, t, r) {
					"use strict";
					function n() {
						if (!(this instanceof n)) return new n();
						if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
						this.files = Object.create(null), this.comment = null, this.root = "", this.clone = function() {
							var e = new n();
							for (var t in this) "function" != typeof this[t] && (e[t] = this[t]);
							return e;
						};
					}
					(n.prototype = e("./object")).loadAsync = e("./load"), n.support = e("./support"), n.defaults = e("./defaults"), n.version = "3.10.2", n.loadAsync = function(e, t) {
						return new n().loadAsync(e, t);
					}, n.external = e("./external"), t.exports = n;
				}, {
					"./defaults": 5,
					"./external": 6,
					"./load": 11,
					"./object": 15,
					"./support": 30
				}],
				11: [function(e, t, r) {
					"use strict";
					var n = e("./utils"), o = e("./external"), i = e("./utf8"), a = e("./zipEntries"), s = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
					function c(e) {
						return new o.Promise(function(t, r) {
							var n = e.decompressed.getContentWorker().pipe(new s());
							n.on("error", function(e) {
								r(e);
							}).on("end", function() {
								n.streamInfo.crc32 !== e.decompressed.crc32 ? r(/* @__PURE__ */ new Error("Corrupted zip : CRC32 mismatch")) : t();
							}).resume();
						});
					}
					t.exports = function(e, t) {
						var r = this;
						return t = n.extend(t || {}, {
							base64: !1,
							checkCRC32: !1,
							optimizedBinaryString: !1,
							createFolders: !1,
							decodeFileName: i.utf8decode
						}), l.isNode && l.isStream(e) ? o.Promise.reject(/* @__PURE__ */ new Error("JSZip can't accept a stream when loading a zip file.")) : n.prepareContent("the loaded zip file", e, !0, t.optimizedBinaryString, t.base64).then(function(e) {
							var r = new a(t);
							return r.load(e), r;
						}).then(function(e) {
							var r = [o.Promise.resolve(e)], n = e.files;
							if (t.checkCRC32) for (var i = 0; i < n.length; i++) r.push(c(n[i]));
							return o.Promise.all(r);
						}).then(function(e) {
							for (var o = e.shift(), i = o.files, a = 0; a < i.length; a++) {
								var s = i[a], l = s.fileNameStr, c = n.resolve(s.fileNameStr);
								r.file(c, s.decompressed, {
									binary: !0,
									optimizedBinaryString: !0,
									date: s.date,
									dir: s.dir,
									comment: s.fileCommentStr.length ? s.fileCommentStr : null,
									unixPermissions: s.unixPermissions,
									dosPermissions: s.dosPermissions,
									createFolders: t.createFolders
								}), s.dir || (r.file(c).unsafeOriginalName = l);
							}
							return o.zipComment.length && (r.comment = o.zipComment), r;
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
				12: [function(e, t, r) {
					"use strict";
					var n = e("../utils"), o = e("../stream/GenericWorker");
					function i(e, t) {
						o.call(this, "Nodejs stream input adapter for " + e), this._upstreamEnded = !1, this._bindStream(t);
					}
					n.inherits(i, o), i.prototype._bindStream = function(e) {
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
				13: [function(e, t, r) {
					"use strict";
					var n = e("readable-stream").Readable;
					function o(e, t, r) {
						n.call(this, t), this._helper = e;
						var o = this;
						e.on("data", function(e, t) {
							o.push(e) || o._helper.pause(), r && r(t);
						}).on("error", function(e) {
							o.emit("error", e);
						}).on("end", function() {
							o.push(null);
						});
					}
					e("../utils").inherits(o, n), o.prototype._read = function() {
						this._helper.resume();
					}, t.exports = o;
				}, {
					"../utils": 32,
					"readable-stream": 16
				}],
				14: [function(e, t, r) {
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
				15: [function(e, t, r) {
					"use strict";
					function n(e, t, r) {
						var n, o = i.getTypeOf(t), s = i.extend(r || {}, l);
						s.date = s.date || /* @__PURE__ */ new Date(), null !== s.compression && (s.compression = s.compression.toUpperCase()), "string" == typeof s.unixPermissions && (s.unixPermissions = parseInt(s.unixPermissions, 8)), s.unixPermissions && 16384 & s.unixPermissions && (s.dir = !0), s.dosPermissions && 16 & s.dosPermissions && (s.dir = !0), s.dir && (e = m(e)), s.createFolders && (n = h(e)) && g.call(this, n, !0);
						var d = "string" === o && !1 === s.binary && !1 === s.base64;
						r && void 0 !== r.binary || (s.binary = !d), (t instanceof c && 0 === t.uncompressedSize || s.dir || !t || 0 === t.length) && (s.base64 = !1, s.binary = !0, t = "", s.compression = "STORE", o = "string");
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
						return t = void 0 !== t ? t : l.createFolders, e = m(e), this.files[e] || n.call(this, e, null, {
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
							var t, r, n;
							for (t in this.files) n = this.files[t], (r = t.slice(this.root.length, t.length)) && t.slice(0, this.root.length) === this.root && e(r, n);
						},
						filter: function(e) {
							var t = [];
							return this.forEach(function(r, n) {
								e(r, n) && t.push(n);
							}), t;
						},
						file: function(e, t, r) {
							if (1 !== arguments.length) return e = this.root + e, n.call(this, e, t, r), this;
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
							if (w(e)) return this.filter(function(t, r) {
								return r.dir && e.test(t);
							});
							var t = this.root + e, r = g.call(this, t), n = this.clone();
							return n.root = r.name, n;
						},
						remove: function(e) {
							e = this.root + e;
							var t = this.files[e];
							if (t || ("/" !== e.slice(-1) && (e += "/"), t = this.files[e]), t && !t.dir) delete this.files[e];
							else for (var r = this.filter(function(t, r) {
								return r.name.slice(0, e.length) === e;
							}), n = 0; n < r.length; n++) delete this.files[r[n].name];
							return this;
						},
						generate: function() {
							throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
						},
						generateInternalStream: function(e) {
							var t, r = {};
							try {
								if ((r = i.extend(e || {}, {
									streamFiles: !1,
									compression: "STORE",
									compressionOptions: null,
									type: "",
									platform: "DOS",
									comment: null,
									mimeType: "application/zip",
									encodeFileName: o.utf8encode
								})).type = r.type.toLowerCase(), r.compression = r.compression.toUpperCase(), "binarystring" === r.type && (r.type = "string"), !r.type) throw new Error("No output type specified.");
								i.checkSupport(r.type), "darwin" !== r.platform && "freebsd" !== r.platform && "linux" !== r.platform && "sunos" !== r.platform || (r.platform = "UNIX"), "win32" === r.platform && (r.platform = "DOS");
								var n = r.comment || this.comment || "";
								t = d.generateWorker(this, r, n);
							} catch (e) {
								(t = new a("error")).error(e);
							}
							return new s(t, r.type || "string", r.mimeType);
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
				16: [function(e, t, r) {
					"use strict";
					t.exports = e("stream");
				}, { stream: void 0 }],
				17: [function(e, t, r) {
					"use strict";
					var n = e("./DataReader");
					function o(e) {
						n.call(this, e);
						for (var t = 0; t < this.data.length; t++) e[t] = 255 & e[t];
					}
					e("../utils").inherits(o, n), o.prototype.byteAt = function(e) {
						return this.data[this.zero + e];
					}, o.prototype.lastIndexOfSignature = function(e) {
						for (var t = e.charCodeAt(0), r = e.charCodeAt(1), n = e.charCodeAt(2), o = e.charCodeAt(3), i = this.length - 4; 0 <= i; --i) if (this.data[i] === t && this.data[i + 1] === r && this.data[i + 2] === n && this.data[i + 3] === o) return i - this.zero;
						return -1;
					}, o.prototype.readAndCheckSignature = function(e) {
						var t = e.charCodeAt(0), r = e.charCodeAt(1), n = e.charCodeAt(2), o = e.charCodeAt(3), i = this.readData(4);
						return t === i[0] && r === i[1] && n === i[2] && o === i[3];
					}, o.prototype.readData = function(e) {
						if (this.checkOffset(e), 0 === e) return [];
						var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./DataReader": 18
				}],
				18: [function(e, t, r) {
					"use strict";
					var n = e("../utils");
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
							var t, r = 0;
							for (this.checkOffset(e), t = this.index + e - 1; t >= this.index; t--) r = (r << 8) + this.byteAt(t);
							return this.index += e, r;
						},
						readString: function(e) {
							return n.transformTo("string", this.readData(e));
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
				19: [function(e, t, r) {
					"use strict";
					var n = e("./Uint8ArrayReader");
					function o(e) {
						n.call(this, e);
					}
					e("../utils").inherits(o, n), o.prototype.readData = function(e) {
						this.checkOffset(e);
						var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./Uint8ArrayReader": 21
				}],
				20: [function(e, t, r) {
					"use strict";
					var n = e("./DataReader");
					function o(e) {
						n.call(this, e);
					}
					e("../utils").inherits(o, n), o.prototype.byteAt = function(e) {
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
				21: [function(e, t, r) {
					"use strict";
					var n = e("./ArrayReader");
					function o(e) {
						n.call(this, e);
					}
					e("../utils").inherits(o, n), o.prototype.readData = function(e) {
						if (this.checkOffset(e), 0 === e) return /* @__PURE__ */ new Uint8Array(0);
						var t = this.data.subarray(this.zero + this.index, this.zero + this.index + e);
						return this.index += e, t;
					}, t.exports = o;
				}, {
					"../utils": 32,
					"./ArrayReader": 17
				}],
				22: [function(e, t, r) {
					"use strict";
					var n = e("../utils"), o = e("../support"), i = e("./ArrayReader"), a = e("./StringReader"), s = e("./NodeBufferReader"), l = e("./Uint8ArrayReader");
					t.exports = function(e) {
						var t = n.getTypeOf(e);
						return n.checkSupport(t), "string" !== t || o.uint8array ? "nodebuffer" === t ? new s(e) : o.uint8array ? new l(n.transformTo("uint8array", e)) : new i(n.transformTo("array", e)) : new a(e);
					};
				}, {
					"../support": 30,
					"../utils": 32,
					"./ArrayReader": 17,
					"./NodeBufferReader": 19,
					"./StringReader": 20,
					"./Uint8ArrayReader": 21
				}],
				23: [function(e, t, r) {
					"use strict";
					r.LOCAL_FILE_HEADER = "PK", r.CENTRAL_FILE_HEADER = "PK", r.CENTRAL_DIRECTORY_END = "PK", r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", r.ZIP64_CENTRAL_DIRECTORY_END = "PK", r.DATA_DESCRIPTOR = "PK\x07\b";
				}, {}],
				24: [function(e, t, r) {
					"use strict";
					var n = e("./GenericWorker"), o = e("../utils");
					function i(e) {
						n.call(this, "ConvertWorker to " + e), this.destType = e;
					}
					o.inherits(i, n), i.prototype.processChunk = function(e) {
						this.push({
							data: o.transformTo(this.destType, e.data),
							meta: e.meta
						});
					}, t.exports = i;
				}, {
					"../utils": 32,
					"./GenericWorker": 28
				}],
				25: [function(e, t, r) {
					"use strict";
					var n = e("./GenericWorker"), o = e("../crc32");
					function i() {
						n.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
					}
					e("../utils").inherits(i, n), i.prototype.processChunk = function(e) {
						this.streamInfo.crc32 = o(e.data, this.streamInfo.crc32 || 0), this.push(e);
					}, t.exports = i;
				}, {
					"../crc32": 4,
					"../utils": 32,
					"./GenericWorker": 28
				}],
				26: [function(e, t, r) {
					"use strict";
					var n = e("../utils"), o = e("./GenericWorker");
					function i(e) {
						o.call(this, "DataLengthProbe for " + e), this.propName = e, this.withStreamInfo(e, 0);
					}
					n.inherits(i, o), i.prototype.processChunk = function(e) {
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
				27: [function(e, t, r) {
					"use strict";
					var n = e("../utils"), o = e("./GenericWorker");
					function i(e) {
						o.call(this, "DataWorker");
						var t = this;
						this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, e.then(function(e) {
							t.dataIsReady = !0, t.data = e, t.max = e && e.length || 0, t.type = n.getTypeOf(e), t.isPaused || t._tickAndRepeat();
						}, function(e) {
							t.error(e);
						});
					}
					n.inherits(i, o), i.prototype.cleanUp = function() {
						o.prototype.cleanUp.call(this), this.data = null;
					}, i.prototype.resume = function() {
						return !!o.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, n.delay(this._tickAndRepeat, [], this)), !0);
					}, i.prototype._tickAndRepeat = function() {
						this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (n.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
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
				28: [function(e, t, r) {
					"use strict";
					function n(e) {
						this.name = e || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
							data: [],
							end: [],
							error: []
						}, this.previous = null;
					}
					n.prototype = {
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
							if (this._listeners[e]) for (var r = 0; r < this._listeners[e].length; r++) this._listeners[e][r].call(this, t);
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
					}, t.exports = n;
				}, {}],
				29: [function(e, t, r) {
					"use strict";
					var n = e("../utils"), o = e("./ConvertWorker"), i = e("./GenericWorker"), a = e("../base64"), s = e("../support"), l = e("../external"), c = null;
					if (s.nodestream) try {
						c = e("../nodejs/NodejsStreamOutputAdapter");
					} catch (e) {}
					function u(e, t, r) {
						var a = t;
						switch (t) {
							case "blob":
							case "arraybuffer":
								a = "uint8array";
								break;
							case "base64": a = "string";
						}
						try {
							this._internalType = a, this._outputType = t, this._mimeType = r, n.checkSupport(a), this._worker = e.pipe(new o(a)), e.lock();
						} catch (e) {
							this._worker = new i("error"), this._worker.error(e);
						}
					}
					u.prototype = {
						accumulate: function(e) {
							return function(e, t) {
								return new l.Promise(function(r, o) {
									var i = [], s = e._internalType, l = e._outputType, c = e._mimeType;
									e.on("data", function(e, r) {
										i.push(e), t && t(r);
									}).on("error", function(e) {
										i = [], o(e);
									}).on("end", function() {
										try {
											r(function(e, t, r) {
												switch (e) {
													case "blob": return n.newBlob(n.transformTo("arraybuffer", t), r);
													case "base64": return a.encode(t);
													default: return n.transformTo(e, t);
												}
											}(l, function(e, t) {
												var r, n = 0, o = null, i = 0;
												for (r = 0; r < t.length; r++) i += t[r].length;
												switch (e) {
													case "string": return t.join("");
													case "array": return Array.prototype.concat.apply([], t);
													case "uint8array":
														for (o = new Uint8Array(i), r = 0; r < t.length; r++) o.set(t[r], n), n += t[r].length;
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
							var r = this;
							return "data" === e ? this._worker.on(e, function(e) {
								t.call(r, e.data, e.meta);
							}) : this._worker.on(e, function() {
								n.delay(t, arguments, r);
							}), this;
						},
						resume: function() {
							return n.delay(this._worker.resume, [], this._worker), this;
						},
						pause: function() {
							return this._worker.pause(), this;
						},
						toNodejsStream: function(e) {
							if (n.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
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
				30: [function(e, t, r) {
					"use strict";
					if (r.base64 = !0, r.array = !0, r.string = !0, r.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, r.nodebuffer = "undefined" != typeof Buffer, r.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) r.blob = !1;
					else {
						var n = /* @__PURE__ */ new ArrayBuffer(0);
						try {
							r.blob = 0 === new Blob([n], { type: "application/zip" }).size;
						} catch (e) {
							try {
								var o = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
								o.append(n), r.blob = 0 === o.getBlob("application/zip").size;
							} catch (e) {
								r.blob = !1;
							}
						}
					}
					try {
						r.nodestream = !!e("readable-stream").Readable;
					} catch (e) {
						r.nodestream = !1;
					}
				}, { "readable-stream": 16 }],
				31: [function(e, t, r) {
					"use strict";
					for (var n = e("./utils"), o = e("./support"), i = e("./nodejsUtils"), a = e("./stream/GenericWorker"), s = new Array(256), l = 0; l < 256; l++) s[l] = 252 <= l ? 6 : 248 <= l ? 5 : 240 <= l ? 4 : 224 <= l ? 3 : 192 <= l ? 2 : 1;
					function c() {
						a.call(this, "utf-8 decode"), this.leftOver = null;
					}
					function u() {
						a.call(this, "utf-8 encode");
					}
					s[254] = s[254] = 1, r.utf8encode = function(e) {
						return o.nodebuffer ? i.newBufferFrom(e, "utf-8") : function(e) {
							var t, r, n, i, a, s = e.length, l = 0;
							for (i = 0; i < s; i++) 55296 == (64512 & (r = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (n = e.charCodeAt(i + 1))) && (r = 65536 + (r - 55296 << 10) + (n - 56320), i++), l += r < 128 ? 1 : r < 2048 ? 2 : r < 65536 ? 3 : 4;
							for (t = o.uint8array ? new Uint8Array(l) : new Array(l), i = a = 0; a < l; i++) 55296 == (64512 & (r = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (n = e.charCodeAt(i + 1))) && (r = 65536 + (r - 55296 << 10) + (n - 56320), i++), r < 128 ? t[a++] = r : (r < 2048 ? t[a++] = 192 | r >>> 6 : (r < 65536 ? t[a++] = 224 | r >>> 12 : (t[a++] = 240 | r >>> 18, t[a++] = 128 | r >>> 12 & 63), t[a++] = 128 | r >>> 6 & 63), t[a++] = 128 | 63 & r);
							return t;
						}(e);
					}, r.utf8decode = function(e) {
						return o.nodebuffer ? n.transformTo("nodebuffer", e).toString("utf-8") : function(e) {
							var t, r, o, i, a = e.length, l = new Array(2 * a);
							for (t = r = 0; t < a;) if ((o = e[t++]) < 128) l[r++] = o;
							else if (4 < (i = s[o])) l[r++] = 65533, t += i - 1;
							else {
								for (o &= 2 === i ? 31 : 3 === i ? 15 : 7; 1 < i && t < a;) o = o << 6 | 63 & e[t++], i--;
								1 < i ? l[r++] = 65533 : o < 65536 ? l[r++] = o : (o -= 65536, l[r++] = 55296 | o >> 10 & 1023, l[r++] = 56320 | 1023 & o);
							}
							return l.length !== r && (l.subarray ? l = l.subarray(0, r) : l.length = r), n.applyFromCharCode(l);
						}(e = n.transformTo(o.uint8array ? "uint8array" : "array", e));
					}, n.inherits(c, a), c.prototype.processChunk = function(e) {
						var t = n.transformTo(o.uint8array ? "uint8array" : "array", e.data);
						if (this.leftOver && this.leftOver.length) {
							if (o.uint8array) {
								var i = t;
								(t = new Uint8Array(i.length + this.leftOver.length)).set(this.leftOver, 0), t.set(i, this.leftOver.length);
							} else t = this.leftOver.concat(t);
							this.leftOver = null;
						}
						var a = function(e, t) {
							var r;
							for ((t = t || e.length) > e.length && (t = e.length), r = t - 1; 0 <= r && 128 == (192 & e[r]);) r--;
							return r < 0 || 0 === r ? t : r + s[e[r]] > t ? r : t;
						}(t), l = t;
						a !== t.length && (o.uint8array ? (l = t.subarray(0, a), this.leftOver = t.subarray(a, t.length)) : (l = t.slice(0, a), this.leftOver = t.slice(a, t.length))), this.push({
							data: r.utf8decode(l),
							meta: e.meta
						});
					}, c.prototype.flush = function() {
						this.leftOver && this.leftOver.length && (this.push({
							data: r.utf8decode(this.leftOver),
							meta: {}
						}), this.leftOver = null);
					}, r.Utf8DecodeWorker = c, n.inherits(u, a), u.prototype.processChunk = function(e) {
						this.push({
							data: r.utf8encode(e.data),
							meta: e.meta
						});
					}, r.Utf8EncodeWorker = u;
				}, {
					"./nodejsUtils": 14,
					"./stream/GenericWorker": 28,
					"./support": 30,
					"./utils": 32
				}],
				32: [function(e, t, r) {
					"use strict";
					var n = e("./support"), o = e("./base64"), i = e("./nodejsUtils"), a = e("./external");
					function s(e) {
						return e;
					}
					function l(e, t) {
						for (var r = 0; r < e.length; ++r) t[r] = 255 & e.charCodeAt(r);
						return t;
					}
					e("setimmediate"), r.newBlob = function(t, n) {
						r.checkSupport("blob");
						try {
							return new Blob([t], { type: n });
						} catch (e) {
							try {
								var o = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
								return o.append(t), o.getBlob(n);
							} catch (e) {
								throw new Error("Bug : can't construct the Blob.");
							}
						}
					};
					var c = {
						stringifyByChunk: function(e, t, r) {
							var n = [], o = 0, i = e.length;
							if (i <= r) return String.fromCharCode.apply(null, e);
							for (; o < i;) "array" === t || "nodebuffer" === t ? n.push(String.fromCharCode.apply(null, e.slice(o, Math.min(o + r, i)))) : n.push(String.fromCharCode.apply(null, e.subarray(o, Math.min(o + r, i)))), o += r;
							return n.join("");
						},
						stringifyByChar: function(e) {
							for (var t = "", r = 0; r < e.length; r++) t += String.fromCharCode(e[r]);
							return t;
						},
						applyCanBeUsed: {
							uint8array: function() {
								try {
									return n.uint8array && 1 === String.fromCharCode.apply(null, /* @__PURE__ */ new Uint8Array(1)).length;
								} catch (e) {
									return !1;
								}
							}(),
							nodebuffer: function() {
								try {
									return n.nodebuffer && 1 === String.fromCharCode.apply(null, i.allocBuffer(1)).length;
								} catch (e) {
									return !1;
								}
							}()
						}
					};
					function u(e) {
						var t = 65536, n = r.getTypeOf(e), o = !0;
						if ("uint8array" === n ? o = c.applyCanBeUsed.uint8array : "nodebuffer" === n && (o = c.applyCanBeUsed.nodebuffer), o) for (; 1 < t;) try {
							return c.stringifyByChunk(e, n, t);
						} catch (e) {
							t = Math.floor(t / 2);
						}
						return c.stringifyByChar(e);
					}
					function d(e, t) {
						for (var r = 0; r < e.length; r++) t[r] = e[r];
						return t;
					}
					r.applyFromCharCode = u;
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
					}, r.transformTo = function(e, t) {
						return t = t || "", e ? (r.checkSupport(e), p[r.getTypeOf(t)][e](t)) : t;
					}, r.resolve = function(e) {
						for (var t = e.split("/"), r = [], n = 0; n < t.length; n++) {
							var o = t[n];
							"." === o || "" === o && 0 !== n && n !== t.length - 1 || (".." === o ? r.pop() : r.push(o));
						}
						return r.join("/");
					}, r.getTypeOf = function(e) {
						if ("string" == typeof e) return "string";
						var t = Object.prototype.toString.call(e);
						return "[object Array]" === t ? "array" : n.nodebuffer && i.isBuffer(e) ? "nodebuffer" : n.uint8array && "[object Uint8Array]" === t ? "uint8array" : n.arraybuffer && "[object ArrayBuffer]" === t ? "arraybuffer" : void 0;
					}, r.checkSupport = function(e) {
						if (!n[e.toLowerCase()]) throw new Error(e + " is not supported by this platform");
					}, r.MAX_VALUE_16BITS = 65535, r.MAX_VALUE_32BITS = -1, r.pretty = function(e) {
						var t, r, n = "";
						for (r = 0; r < (e || "").length; r++) n += "\\x" + ((t = e.charCodeAt(r)) < 16 ? "0" : "") + t.toString(16).toUpperCase();
						return n;
					}, r.delay = function(e, t, r) {
						setImmediate(function() {
							e.apply(r || null, t || []);
						});
					}, r.inherits = function(e, t) {
						function r() {}
						r.prototype = t.prototype, e.prototype = new r();
					}, r.extend = function() {
						var e, t, r = {};
						for (e = 0; e < arguments.length; e++) for (t in arguments[e]) Object.prototype.hasOwnProperty.call(arguments[e], t) && void 0 === r[t] && (r[t] = arguments[e][t]);
						return r;
					}, r.prepareContent = function(e, t, i, s, c) {
						return a.Promise.resolve(t).then(function(t) {
							return n.blob && (t instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(t))) ? void 0 !== Blob.prototype.arrayBuffer ? t.arrayBuffer() : "undefined" != typeof FileReader ? new a.Promise(function(e, r) {
								var n = new FileReader();
								n.onload = function(t) {
									e(t.target.result);
								}, n.onerror = function(e) {
									r(e.target.error);
								}, n.readAsArrayBuffer(t);
							}) : a.Promise.reject(/* @__PURE__ */ new Error(e + " is a Blob, but we have no way of reading it.")) : t;
						}).then(function(t) {
							var u = r.getTypeOf(t);
							return u ? ("arraybuffer" === u ? t = r.transformTo("uint8array", t) : "string" === u && (c ? t = o.decode(t) : i && !0 !== s && (t = function(e) {
								return l(e, n.uint8array ? new Uint8Array(e.length) : new Array(e.length));
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
				33: [function(e, t, r) {
					"use strict";
					var n = e("./reader/readerFor"), o = e("./utils"), i = e("./signature"), a = e("./zipEntry"), s = e("./support");
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
							var r = this.reader.index;
							this.reader.setIndex(e);
							var n = this.reader.readString(4) === t;
							return this.reader.setIndex(r), n;
						},
						readBlockEndOfCentral: function() {
							this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
							var e = this.reader.readData(this.zipCommentLength), t = s.uint8array ? "uint8array" : "array", r = o.transformTo(t, e);
							this.zipComment = this.loadOptions.decodeFileName(r);
						},
						readBlockZip64EndOfCentral: function() {
							this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
							for (var e, t, r, n = this.zip64EndOfCentralSize - 44; 0 < n;) e = this.reader.readInt(2), t = this.reader.readInt(4), r = this.reader.readData(t), this.zip64ExtensibleData[e] = {
								id: e,
								length: t,
								value: r
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
							var r = this.centralDirOffset + this.centralDirSize;
							this.zip64 && (r += 20, r += 12 + this.zip64EndOfCentralSize);
							var n = t - r;
							if (0 < n) this.isSignature(t, i.CENTRAL_FILE_HEADER) || (this.reader.zero = n);
							else if (n < 0) throw new Error("Corrupted zip: missing " + Math.abs(n) + " bytes.");
						},
						prepareReader: function(e) {
							this.reader = n(e);
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
				34: [function(e, t, r) {
					"use strict";
					var n = e("./reader/readerFor"), o = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), s = e("./utf8"), l = e("./compressions"), c = e("./support");
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
							var t, r;
							if (e.skip(22), this.fileNameLength = e.readInt(2), r = e.readInt(2), this.fileName = e.readData(this.fileNameLength), e.skip(r), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
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
								var e = n(this.extraFields[1].value);
								this.uncompressedSize === o.MAX_VALUE_32BITS && (this.uncompressedSize = e.readInt(8)), this.compressedSize === o.MAX_VALUE_32BITS && (this.compressedSize = e.readInt(8)), this.localHeaderOffset === o.MAX_VALUE_32BITS && (this.localHeaderOffset = e.readInt(8)), this.diskNumberStart === o.MAX_VALUE_32BITS && (this.diskNumberStart = e.readInt(4));
							}
						},
						readExtraFields: function(e) {
							var t, r, n, o = e.index + this.extraFieldsLength;
							for (this.extraFields || (this.extraFields = {}); e.index + 4 < o;) t = e.readInt(2), r = e.readInt(2), n = e.readData(r), this.extraFields[t] = {
								id: t,
								length: r,
								value: n
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
									var r = o.transformTo(e, this.fileName);
									this.fileNameStr = this.loadOptions.decodeFileName(r);
								}
								var n = this.findExtraFieldUnicodeComment();
								if (null !== n) this.fileCommentStr = n;
								else {
									var i = o.transformTo(e, this.fileComment);
									this.fileCommentStr = this.loadOptions.decodeFileName(i);
								}
							}
						},
						findExtraFieldUnicodePath: function() {
							var e = this.extraFields[28789];
							if (e) {
								var t = n(e.value);
								return 1 !== t.readInt(1) || a(this.fileName) !== t.readInt(4) ? null : s.utf8decode(t.readData(e.length - 5));
							}
							return null;
						},
						findExtraFieldUnicodeComment: function() {
							var e = this.extraFields[25461];
							if (e) {
								var t = n(e.value);
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
				35: [function(e, t, r) {
					"use strict";
					function n(e, t, r) {
						this.name = e, this.dir = r.dir, this.date = r.date, this.comment = r.comment, this.unixPermissions = r.unixPermissions, this.dosPermissions = r.dosPermissions, this._data = t, this._dataBinary = r.binary, this.options = {
							compression: r.compression,
							compressionOptions: r.compressionOptions
						};
					}
					var o = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), s = e("./compressedObject"), l = e("./stream/GenericWorker");
					n.prototype = {
						internalStream: function(e) {
							var t = null, r = "string";
							try {
								if (!e) throw new Error("No output type specified.");
								var n = "string" === (r = e.toLowerCase()) || "text" === r;
								"binarystring" !== r && "text" !== r || (r = "string"), t = this._decompressWorker();
								var i = !this._dataBinary;
								i && !n && (t = t.pipe(new a.Utf8EncodeWorker())), !i && n && (t = t.pipe(new a.Utf8DecodeWorker()));
							} catch (e) {
								(t = new l("error")).error(e);
							}
							return new o(t, r, "");
						},
						async: function(e, t) {
							return this.internalStream(e).accumulate(t);
						},
						nodeStream: function(e, t) {
							return this.internalStream(e || "nodebuffer").toNodejsStream(t);
						},
						_compressWorker: function(e, t) {
							if (this._data instanceof s && this._data.compression.magic === e.magic) return this._data.getCompressedWorker();
							var r = this._decompressWorker();
							return this._dataBinary || (r = r.pipe(new a.Utf8EncodeWorker())), s.createWorkerFrom(r, e, t);
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
					}, d = 0; d < c.length; d++) n.prototype[c[d]] = u;
					t.exports = n;
				}, {
					"./compressedObject": 2,
					"./stream/DataWorker": 27,
					"./stream/GenericWorker": 28,
					"./stream/StreamHelper": 29,
					"./utf8": 31
				}],
				36: [function(e, t, r) {
					(function(e) {
						"use strict";
						var r, n, o = e.MutationObserver || e.WebKitMutationObserver;
						if (o) {
							var i = 0, a = new o(u), s = e.document.createTextNode("");
							a.observe(s, { characterData: !0 }), r = function() {
								s.data = i = ++i % 2;
							};
						} else if (e.setImmediate || void 0 === e.MessageChannel) r = "document" in e && "onreadystatechange" in e.document.createElement("script") ? function() {
							var t = e.document.createElement("script");
							t.onreadystatechange = function() {
								u(), t.onreadystatechange = null, t.parentNode.removeChild(t), t = null;
							}, e.document.documentElement.appendChild(t);
						} : function() {
							setTimeout(u, 0);
						};
						else {
							var l = new e.MessageChannel();
							l.port1.onmessage = u, r = function() {
								l.port2.postMessage(0);
							};
						}
						var c = [];
						function u() {
							var e, t;
							n = !0;
							for (var r = c.length; r;) {
								for (t = c, c = [], e = -1; ++e < r;) t[e]();
								r = c.length;
							}
							n = !1;
						}
						t.exports = function(e) {
							1 !== c.push(e) || n || r();
						};
					}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
				}, {}],
				37: [function(e, t, r) {
					"use strict";
					var n = e("immediate");
					function o() {}
					var i = {}, a = ["REJECTED"], s = ["FULFILLED"], l = ["PENDING"];
					function c(e) {
						if ("function" != typeof e) throw new TypeError("resolver must be a function");
						this.state = l, this.queue = [], this.outcome = void 0, e !== o && f(this, e);
					}
					function u(e, t, r) {
						this.promise = e, "function" == typeof t && (this.onFulfilled = t, this.callFulfilled = this.otherCallFulfilled), "function" == typeof r && (this.onRejected = r, this.callRejected = this.otherCallRejected);
					}
					function d(e, t, r) {
						n(function() {
							var n;
							try {
								n = t(r);
							} catch (n) {
								return i.reject(e, n);
							}
							n === e ? i.reject(e, /* @__PURE__ */ new TypeError("Cannot resolve promise with itself")) : i.resolve(e, n);
						});
					}
					function p(e) {
						var t = e && e.then;
						if (e && ("object" == typeof e || "function" == typeof e) && "function" == typeof t) return function() {
							t.apply(e, arguments);
						};
					}
					function f(e, t) {
						var r = !1;
						function n(t) {
							r || (r = !0, i.reject(e, t));
						}
						function o(t) {
							r || (r = !0, i.resolve(e, t));
						}
						var a = h(function() {
							t(o, n);
						});
						"error" === a.status && n(a.value);
					}
					function h(e, t) {
						var r = {};
						try {
							r.value = e(t), r.status = "success";
						} catch (e) {
							r.status = "error", r.value = e;
						}
						return r;
					}
					(t.exports = c).prototype.finally = function(e) {
						if ("function" != typeof e) return this;
						var t = this.constructor;
						return this.then(function(r) {
							return t.resolve(e()).then(function() {
								return r;
							});
						}, function(r) {
							return t.resolve(e()).then(function() {
								throw r;
							});
						});
					}, c.prototype.catch = function(e) {
						return this.then(null, e);
					}, c.prototype.then = function(e, t) {
						if ("function" != typeof e && this.state === s || "function" != typeof t && this.state === a) return this;
						var r = new this.constructor(o);
						return this.state !== l ? d(r, this.state === s ? e : t, this.outcome) : this.queue.push(new u(r, e, t)), r;
					}, u.prototype.callFulfilled = function(e) {
						i.resolve(this.promise, e);
					}, u.prototype.otherCallFulfilled = function(e) {
						d(this.promise, this.onFulfilled, e);
					}, u.prototype.callRejected = function(e) {
						i.reject(this.promise, e);
					}, u.prototype.otherCallRejected = function(e) {
						d(this.promise, this.onRejected, e);
					}, i.resolve = function(e, t) {
						var r = h(p, t);
						if ("error" === r.status) return i.reject(e, r.value);
						var n = r.value;
						if (n) f(e, n);
						else {
							e.state = s, e.outcome = t;
							for (var o = -1, a = e.queue.length; ++o < a;) e.queue[o].callFulfilled(t);
						}
						return e;
					}, i.reject = function(e, t) {
						e.state = a, e.outcome = t;
						for (var r = -1, n = e.queue.length; ++r < n;) e.queue[r].callRejected(t);
						return e;
					}, c.resolve = function(e) {
						return e instanceof this ? e : i.resolve(new this(o), e);
					}, c.reject = function(e) {
						var t = new this(o);
						return i.reject(t, e);
					}, c.all = function(e) {
						var t = this;
						if ("[object Array]" !== Object.prototype.toString.call(e)) return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
						var r = e.length, n = !1;
						if (!r) return this.resolve([]);
						for (var a = new Array(r), s = 0, l = -1, c = new this(o); ++l < r;) u(e[l], l);
						return c;
						function u(e, o) {
							t.resolve(e).then(function(e) {
								a[o] = e, ++s !== r || n || (n = !0, i.resolve(c, a));
							}, function(e) {
								n || (n = !0, i.reject(c, e));
							});
						}
					}, c.race = function(e) {
						if ("[object Array]" !== Object.prototype.toString.call(e)) return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
						var t = e.length, r = !1;
						if (!t) return this.resolve([]);
						for (var n, a = -1, s = new this(o); ++a < t;) n = e[a], this.resolve(n).then(function(e) {
							r || (r = !0, i.resolve(s, e));
						}, function(e) {
							r || (r = !0, i.reject(s, e));
						});
						return s;
					};
				}, { immediate: 36 }],
				38: [function(e, t, r) {
					"use strict";
					var n = {};
					(0, e("./lib/utils/common").assign)(n, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = n;
				}, {
					"./lib/deflate": 39,
					"./lib/inflate": 40,
					"./lib/utils/common": 41,
					"./lib/zlib/constants": 44
				}],
				39: [function(e, t, r) {
					"use strict";
					var n = e("./zlib/deflate"), o = e("./utils/common"), i = e("./utils/strings"), a = e("./zlib/messages"), s = e("./zlib/zstream"), l = Object.prototype.toString;
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
						var r = n.deflateInit2(this.strm, t.level, t.method, t.windowBits, t.memLevel, t.strategy);
						if (0 !== r) throw new Error(a[r]);
						if (t.header && n.deflateSetHeader(this.strm, t.header), t.dictionary) {
							var u = "string" == typeof t.dictionary ? i.string2buf(t.dictionary) : "[object ArrayBuffer]" === l.call(t.dictionary) ? new Uint8Array(t.dictionary) : t.dictionary;
							if (0 !== (r = n.deflateSetDictionary(this.strm, u))) throw new Error(a[r]);
							this._dict_set = !0;
						}
					}
					function u(e, t) {
						var r = new c(t);
						if (r.push(e, !0), r.err) throw r.msg || a[r.err];
						return r.result;
					}
					c.prototype.push = function(e, t) {
						var r, a, s = this.strm, c = this.options.chunkSize;
						if (this.ended) return !1;
						a = t === ~~t ? t : !0 === t ? 4 : 0, "string" == typeof e ? s.input = i.string2buf(e) : "[object ArrayBuffer]" === l.call(e) ? s.input = new Uint8Array(e) : s.input = e, s.next_in = 0, s.avail_in = s.input.length;
						do {
							if (0 === s.avail_out && (s.output = new o.Buf8(c), s.next_out = 0, s.avail_out = c), 1 !== (r = n.deflate(s, a)) && 0 !== r) return this.onEnd(r), !(this.ended = !0);
							0 !== s.avail_out && (0 !== s.avail_in || 4 !== a && 2 !== a) || ("string" === this.options.to ? this.onData(i.buf2binstring(o.shrinkBuf(s.output, s.next_out))) : this.onData(o.shrinkBuf(s.output, s.next_out)));
						} while ((0 < s.avail_in || 0 === s.avail_out) && 1 !== r);
						return 4 === a ? (r = n.deflateEnd(this.strm), this.onEnd(r), this.ended = !0, 0 === r) : 2 !== a || (this.onEnd(0), !(s.avail_out = 0));
					}, c.prototype.onData = function(e) {
						this.chunks.push(e);
					}, c.prototype.onEnd = function(e) {
						0 === e && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
					}, r.Deflate = c, r.deflate = u, r.deflateRaw = function(e, t) {
						return (t = t || {}).raw = !0, u(e, t);
					}, r.gzip = function(e, t) {
						return (t = t || {}).gzip = !0, u(e, t);
					};
				}, {
					"./utils/common": 41,
					"./utils/strings": 42,
					"./zlib/deflate": 46,
					"./zlib/messages": 51,
					"./zlib/zstream": 53
				}],
				40: [function(e, t, r) {
					"use strict";
					var n = e("./zlib/inflate"), o = e("./utils/common"), i = e("./utils/strings"), a = e("./zlib/constants"), s = e("./zlib/messages"), l = e("./zlib/zstream"), c = e("./zlib/gzheader"), u = Object.prototype.toString;
					function d(e) {
						if (!(this instanceof d)) return new d(e);
						this.options = o.assign({
							chunkSize: 16384,
							windowBits: 0,
							to: ""
						}, e || {});
						var t = this.options;
						t.raw && 0 <= t.windowBits && t.windowBits < 16 && (t.windowBits = -t.windowBits, 0 === t.windowBits && (t.windowBits = -15)), !(0 <= t.windowBits && t.windowBits < 16) || e && e.windowBits || (t.windowBits += 32), 15 < t.windowBits && t.windowBits < 48 && !(15 & t.windowBits) && (t.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l(), this.strm.avail_out = 0;
						var r = n.inflateInit2(this.strm, t.windowBits);
						if (r !== a.Z_OK) throw new Error(s[r]);
						this.header = new c(), n.inflateGetHeader(this.strm, this.header);
					}
					function p(e, t) {
						var r = new d(t);
						if (r.push(e, !0), r.err) throw r.msg || s[r.err];
						return r.result;
					}
					d.prototype.push = function(e, t) {
						var r, s, l, c, d, p, f = this.strm, h = this.options.chunkSize, m = this.options.dictionary, g = !1;
						if (this.ended) return !1;
						s = t === ~~t ? t : !0 === t ? a.Z_FINISH : a.Z_NO_FLUSH, "string" == typeof e ? f.input = i.binstring2buf(e) : "[object ArrayBuffer]" === u.call(e) ? f.input = new Uint8Array(e) : f.input = e, f.next_in = 0, f.avail_in = f.input.length;
						do {
							if (0 === f.avail_out && (f.output = new o.Buf8(h), f.next_out = 0, f.avail_out = h), (r = n.inflate(f, a.Z_NO_FLUSH)) === a.Z_NEED_DICT && m && (p = "string" == typeof m ? i.string2buf(m) : "[object ArrayBuffer]" === u.call(m) ? new Uint8Array(m) : m, r = n.inflateSetDictionary(this.strm, p)), r === a.Z_BUF_ERROR && !0 === g && (r = a.Z_OK, g = !1), r !== a.Z_STREAM_END && r !== a.Z_OK) return this.onEnd(r), !(this.ended = !0);
							f.next_out && (0 !== f.avail_out && r !== a.Z_STREAM_END && (0 !== f.avail_in || s !== a.Z_FINISH && s !== a.Z_SYNC_FLUSH) || ("string" === this.options.to ? (l = i.utf8border(f.output, f.next_out), c = f.next_out - l, d = i.buf2string(f.output, l), f.next_out = c, f.avail_out = h - c, c && o.arraySet(f.output, f.output, l, c, 0), this.onData(d)) : this.onData(o.shrinkBuf(f.output, f.next_out)))), 0 === f.avail_in && 0 === f.avail_out && (g = !0);
						} while ((0 < f.avail_in || 0 === f.avail_out) && r !== a.Z_STREAM_END);
						return r === a.Z_STREAM_END && (s = a.Z_FINISH), s === a.Z_FINISH ? (r = n.inflateEnd(this.strm), this.onEnd(r), this.ended = !0, r === a.Z_OK) : s !== a.Z_SYNC_FLUSH || (this.onEnd(a.Z_OK), !(f.avail_out = 0));
					}, d.prototype.onData = function(e) {
						this.chunks.push(e);
					}, d.prototype.onEnd = function(e) {
						e === a.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
					}, r.Inflate = d, r.inflate = p, r.inflateRaw = function(e, t) {
						return (t = t || {}).raw = !0, p(e, t);
					}, r.ungzip = p;
				}, {
					"./utils/common": 41,
					"./utils/strings": 42,
					"./zlib/constants": 44,
					"./zlib/gzheader": 47,
					"./zlib/inflate": 49,
					"./zlib/messages": 51,
					"./zlib/zstream": 53
				}],
				41: [function(e, t, r) {
					"use strict";
					var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
					r.assign = function(e) {
						for (var t = Array.prototype.slice.call(arguments, 1); t.length;) {
							var r = t.shift();
							if (r) {
								if ("object" != typeof r) throw new TypeError(r + "must be non-object");
								for (var n in r) r.hasOwnProperty(n) && (e[n] = r[n]);
							}
						}
						return e;
					}, r.shrinkBuf = function(e, t) {
						return e.length === t ? e : e.subarray ? e.subarray(0, t) : (e.length = t, e);
					};
					var o = {
						arraySet: function(e, t, r, n, o) {
							if (t.subarray && e.subarray) e.set(t.subarray(r, r + n), o);
							else for (var i = 0; i < n; i++) e[o + i] = t[r + i];
						},
						flattenChunks: function(e) {
							for (var t, r, n, o, i = t = 0, a = e.length; i < a; i++) t += e[i].length;
							for (o = new Uint8Array(t), i = r = 0, a = e.length; i < a; i++) n = e[i], o.set(n, r), r += n.length;
							return o;
						}
					}, i = {
						arraySet: function(e, t, r, n, o) {
							for (var i = 0; i < n; i++) e[o + i] = t[r + i];
						},
						flattenChunks: function(e) {
							return [].concat.apply([], e);
						}
					};
					r.setTyped = function(e) {
						e ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, o)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, i));
					}, r.setTyped(n);
				}, {}],
				42: [function(e, t, r) {
					"use strict";
					var n = e("./common"), o = !0, i = !0;
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
					for (var a = new n.Buf8(256), s = 0; s < 256; s++) a[s] = 252 <= s ? 6 : 248 <= s ? 5 : 240 <= s ? 4 : 224 <= s ? 3 : 192 <= s ? 2 : 1;
					function l(e, t) {
						if (t < 65537 && (e.subarray && i || !e.subarray && o)) return String.fromCharCode.apply(null, n.shrinkBuf(e, t));
						for (var r = "", a = 0; a < t; a++) r += String.fromCharCode(e[a]);
						return r;
					}
					a[254] = a[254] = 1, r.string2buf = function(e) {
						var t, r, o, i, a, s = e.length, l = 0;
						for (i = 0; i < s; i++) 55296 == (64512 & (r = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (o = e.charCodeAt(i + 1))) && (r = 65536 + (r - 55296 << 10) + (o - 56320), i++), l += r < 128 ? 1 : r < 2048 ? 2 : r < 65536 ? 3 : 4;
						for (t = new n.Buf8(l), i = a = 0; a < l; i++) 55296 == (64512 & (r = e.charCodeAt(i))) && i + 1 < s && 56320 == (64512 & (o = e.charCodeAt(i + 1))) && (r = 65536 + (r - 55296 << 10) + (o - 56320), i++), r < 128 ? t[a++] = r : (r < 2048 ? t[a++] = 192 | r >>> 6 : (r < 65536 ? t[a++] = 224 | r >>> 12 : (t[a++] = 240 | r >>> 18, t[a++] = 128 | r >>> 12 & 63), t[a++] = 128 | r >>> 6 & 63), t[a++] = 128 | 63 & r);
						return t;
					}, r.buf2binstring = function(e) {
						return l(e, e.length);
					}, r.binstring2buf = function(e) {
						for (var t = new n.Buf8(e.length), r = 0, o = t.length; r < o; r++) t[r] = e.charCodeAt(r);
						return t;
					}, r.buf2string = function(e, t) {
						var r, n, o, i, s = t || e.length, c = new Array(2 * s);
						for (r = n = 0; r < s;) if ((o = e[r++]) < 128) c[n++] = o;
						else if (4 < (i = a[o])) c[n++] = 65533, r += i - 1;
						else {
							for (o &= 2 === i ? 31 : 3 === i ? 15 : 7; 1 < i && r < s;) o = o << 6 | 63 & e[r++], i--;
							1 < i ? c[n++] = 65533 : o < 65536 ? c[n++] = o : (o -= 65536, c[n++] = 55296 | o >> 10 & 1023, c[n++] = 56320 | 1023 & o);
						}
						return l(c, n);
					}, r.utf8border = function(e, t) {
						var r;
						for ((t = t || e.length) > e.length && (t = e.length), r = t - 1; 0 <= r && 128 == (192 & e[r]);) r--;
						return r < 0 || 0 === r ? t : r + a[e[r]] > t ? r : t;
					};
				}, { "./common": 41 }],
				43: [function(e, t, r) {
					"use strict";
					t.exports = function(e, t, r, n) {
						for (var o = 65535 & e, i = e >>> 16 & 65535, a = 0; 0 !== r;) {
							for (r -= a = 2e3 < r ? 2e3 : r; i = i + (o = o + t[n++] | 0) | 0, --a;);
							o %= 65521, i %= 65521;
						}
						return o | i << 16;
					};
				}, {}],
				44: [function(e, t, r) {
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
				45: [function(e, t, r) {
					"use strict";
					var n = function() {
						for (var e, t = [], r = 0; r < 256; r++) {
							e = r;
							for (var n = 0; n < 8; n++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
							t[r] = e;
						}
						return t;
					}();
					t.exports = function(e, t, r, o) {
						var i = n, a = o + r;
						e ^= -1;
						for (var s = o; s < a; s++) e = e >>> 8 ^ i[255 & (e ^ t[s])];
						return -1 ^ e;
					};
				}, {}],
				46: [function(e, t, r) {
					"use strict";
					var n, o = e("../utils/common"), i = e("./trees"), a = e("./adler32"), s = e("./crc32"), l = e("./messages"), c = -2, u = 258, d = 262, p = 113;
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
						var t = e.state, r = t.pending;
						r > e.avail_out && (r = e.avail_out), 0 !== r && (o.arraySet(e.output, t.pending_buf, t.pending_out, r, e.next_out), e.next_out += r, t.pending_out += r, e.total_out += r, e.avail_out -= r, t.pending -= r, 0 === t.pending && (t.pending_out = 0));
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
						var r, n, o = e.max_chain_length, i = e.strstart, a = e.prev_length, s = e.nice_match, l = e.strstart > e.w_size - d ? e.strstart - (e.w_size - d) : 0, c = e.window, p = e.w_mask, f = e.prev, h = e.strstart + u, m = c[i + a - 1], g = c[i + a];
						e.prev_length >= e.good_match && (o >>= 2), s > e.lookahead && (s = e.lookahead);
						do
							if (c[(r = t) + a] === g && c[r + a - 1] === m && c[r] === c[i] && c[++r] === c[i + 1]) {
								i += 2, r++;
								do								;
while (c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && c[++i] === c[++r] && i < h);
								if (n = u - (h - i), i = h - u, a < n) {
									if (e.match_start = t, s <= (a = n)) break;
									m = c[i + a - 1], g = c[i + a];
								}
							}
						while ((t = f[t & p]) > l && 0 != --o);
						return a <= e.lookahead ? a : e.lookahead;
					}
					function x(e) {
						var t, r, n, i, l, c, u, p, f, h, m = e.w_size;
						do {
							if (i = e.window_size - e.lookahead - e.strstart, e.strstart >= m + (m - d)) {
								for (o.arraySet(e.window, e.window, m, m, 0), e.match_start -= m, e.strstart -= m, e.block_start -= m, t = r = e.hash_size; n = e.head[--t], e.head[t] = m <= n ? n - m : 0, --r;);
								for (t = r = m; n = e.prev[--t], e.prev[t] = m <= n ? n - m : 0, --r;);
								i += m;
							}
							if (0 === e.strm.avail_in) break;
							if (c = e.strm, u = e.window, p = e.strstart + e.lookahead, h = void 0, (f = i) < (h = c.avail_in) && (h = f), r = 0 === h ? 0 : (c.avail_in -= h, o.arraySet(u, c.input, c.next_in, h, p), 1 === c.state.wrap ? c.adler = a(c.adler, u, h, p) : 2 === c.state.wrap && (c.adler = s(c.adler, u, h, p)), c.next_in += h, c.total_in += h, h), e.lookahead += r, e.lookahead + e.insert >= 3) for (l = e.strstart - e.insert, e.ins_h = e.window[l], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + 3 - 1]) & e.hash_mask, e.prev[l & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = l, l++, e.insert--, !(e.lookahead + e.insert < 3)););
						} while (e.lookahead < d && 0 !== e.strm.avail_in);
					}
					function E(e, t) {
						for (var r, n;;) {
							if (e.lookahead < d) {
								if (x(e), e.lookahead < d && 0 === t) return 1;
								if (0 === e.lookahead) break;
							}
							if (r = 0, e.lookahead >= 3 && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), 0 !== r && e.strstart - r <= e.w_size - d && (e.match_length = y(e, r)), e.match_length >= 3) if (n = i._tr_tally(e, e.strstart - e.match_start, e.match_length - 3), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= 3) {
								for (e.match_length--; e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart, 0 != --e.match_length;);
								e.strstart++;
							} else e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
							else n = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
							if (n && (w(e, !1), 0 === e.strm.avail_out)) return 1;
						}
						return e.insert = e.strstart < 2 ? e.strstart : 2, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
					}
					function S(e, t) {
						for (var r, n, o;;) {
							if (e.lookahead < d) {
								if (x(e), e.lookahead < d && 0 === t) return 1;
								if (0 === e.lookahead) break;
							}
							if (r = 0, e.lookahead >= 3 && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = 2, 0 !== r && e.prev_length < e.max_lazy_match && e.strstart - r <= e.w_size - d && (e.match_length = y(e, r), e.match_length <= 5 && (1 === e.strategy || 3 === e.match_length && 4096 < e.strstart - e.match_start) && (e.match_length = 2)), e.prev_length >= 3 && e.match_length <= e.prev_length) {
								for (o = e.strstart + e.lookahead - 3, n = i._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - 3), e.lookahead -= e.prev_length - 1, e.prev_length -= 2; ++e.strstart <= o && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 3 - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), 0 != --e.prev_length;);
								if (e.match_available = 0, e.match_length = 2, e.strstart++, n && (w(e, !1), 0 === e.strm.avail_out)) return 1;
							} else if (e.match_available) {
								if ((n = i._tr_tally(e, 0, e.window[e.strstart - 1])) && w(e, !1), e.strstart++, e.lookahead--, 0 === e.strm.avail_out) return 1;
							} else e.match_available = 1, e.strstart++, e.lookahead--;
						}
						return e.match_available && (n = i._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < 2 ? e.strstart : 2, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
					}
					function N(e, t, r, n, o) {
						this.good_length = e, this.max_lazy = t, this.nice_length = r, this.max_chain = n, this.func = o;
					}
					function k() {
						this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = 8, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(1146), this.dyn_dtree = new o.Buf16(122), this.bl_tree = new o.Buf16(78), m(this.dyn_ltree), m(this.dyn_dtree), m(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(16), this.heap = new o.Buf16(573), m(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(573), m(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
					}
					function _(e) {
						var t;
						return e && e.state ? (e.total_in = e.total_out = 0, e.data_type = 2, (t = e.state).pending = 0, t.pending_out = 0, t.wrap < 0 && (t.wrap = -t.wrap), t.status = t.wrap ? 42 : p, e.adler = 2 === t.wrap ? 0 : 1, t.last_flush = 0, i._tr_init(t), 0) : f(e, c);
					}
					function T(e) {
						var t = _(e);
						return 0 === t && function(e) {
							e.window_size = 2 * e.w_size, m(e.head), e.max_lazy_match = n[e.level].max_lazy, e.good_match = n[e.level].good_length, e.nice_match = n[e.level].nice_length, e.max_chain_length = n[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = 2, e.match_available = 0, e.ins_h = 0;
						}(e.state), t;
					}
					function I(e, t, r, n, i, a) {
						if (!e) return c;
						var s = 1;
						if (-1 === t && (t = 6), n < 0 ? (s = 0, n = -n) : 15 < n && (s = 2, n -= 16), i < 1 || 9 < i || 8 !== r || n < 8 || 15 < n || t < 0 || 9 < t || a < 0 || 4 < a) return f(e, c);
						8 === n && (n = 9);
						var l = new k();
						return (e.state = l).strm = e, l.wrap = s, l.gzhead = null, l.w_bits = n, l.w_size = 1 << l.w_bits, l.w_mask = l.w_size - 1, l.hash_bits = i + 7, l.hash_size = 1 << l.hash_bits, l.hash_mask = l.hash_size - 1, l.hash_shift = ~~((l.hash_bits + 3 - 1) / 3), l.window = new o.Buf8(2 * l.w_size), l.head = new o.Buf16(l.hash_size), l.prev = new o.Buf16(l.w_size), l.lit_bufsize = 1 << i + 6, l.pending_buf_size = 4 * l.lit_bufsize, l.pending_buf = new o.Buf8(l.pending_buf_size), l.d_buf = 1 * l.lit_bufsize, l.l_buf = 3 * l.lit_bufsize, l.level = t, l.strategy = a, l.method = r, T(e);
					}
					n = [
						new N(0, 0, 0, 0, function(e, t) {
							var r = 65535;
							for (r > e.pending_buf_size - 5 && (r = e.pending_buf_size - 5);;) {
								if (e.lookahead <= 1) {
									if (x(e), 0 === e.lookahead && 0 === t) return 1;
									if (0 === e.lookahead) break;
								}
								e.strstart += e.lookahead, e.lookahead = 0;
								var n = e.block_start + r;
								if ((0 === e.strstart || e.strstart >= n) && (e.lookahead = e.strstart - n, e.strstart = n, w(e, !1), 0 === e.strm.avail_out)) return 1;
								if (e.strstart - e.block_start >= e.w_size - d && (w(e, !1), 0 === e.strm.avail_out)) return 1;
							}
							return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : (e.strstart > e.block_start && (w(e, !1), e.strm.avail_out), 1);
						}),
						new N(4, 4, 8, 4, E),
						new N(4, 5, 16, 8, E),
						new N(4, 6, 32, 32, E),
						new N(4, 4, 16, 16, S),
						new N(8, 16, 32, 32, S),
						new N(8, 16, 128, 128, S),
						new N(8, 32, 128, 256, S),
						new N(32, 128, 258, 1024, S),
						new N(32, 258, 258, 4096, S)
					], r.deflateInit = function(e, t) {
						return I(e, t, 8, 15, 8, 0);
					}, r.deflateInit2 = I, r.deflateReset = T, r.deflateResetKeep = _, r.deflateSetHeader = function(e, t) {
						return e && e.state ? 2 !== e.state.wrap ? c : (e.state.gzhead = t, 0) : c;
					}, r.deflate = function(e, t) {
						var r, o, a, l;
						if (!e || !e.state || 5 < t || t < 0) return e ? f(e, c) : c;
						if (o = e.state, !e.output || !e.input && 0 !== e.avail_in || 666 === o.status && 4 !== t) return f(e, 0 === e.avail_out ? -5 : c);
						if (o.strm = e, r = o.last_flush, o.last_flush = t, 42 === o.status) if (2 === o.wrap) e.adler = 0, b(o, 31), b(o, 139), b(o, 8), o.gzhead ? (b(o, (o.gzhead.text ? 1 : 0) + (o.gzhead.hcrc ? 2 : 0) + (o.gzhead.extra ? 4 : 0) + (o.gzhead.name ? 8 : 0) + (o.gzhead.comment ? 16 : 0)), b(o, 255 & o.gzhead.time), b(o, o.gzhead.time >> 8 & 255), b(o, o.gzhead.time >> 16 & 255), b(o, o.gzhead.time >> 24 & 255), b(o, 9 === o.level ? 2 : 2 <= o.strategy || o.level < 2 ? 4 : 0), b(o, 255 & o.gzhead.os), o.gzhead.extra && o.gzhead.extra.length && (b(o, 255 & o.gzhead.extra.length), b(o, o.gzhead.extra.length >> 8 & 255)), o.gzhead.hcrc && (e.adler = s(e.adler, o.pending_buf, o.pending, 0)), o.gzindex = 0, o.status = 69) : (b(o, 0), b(o, 0), b(o, 0), b(o, 0), b(o, 0), b(o, 9 === o.level ? 2 : 2 <= o.strategy || o.level < 2 ? 4 : 0), b(o, 3), o.status = p);
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
						} else if (0 === e.avail_in && h(t) <= h(r) && 4 !== t) return f(e, -5);
						if (666 === o.status && 0 !== e.avail_in) return f(e, -5);
						if (0 !== e.avail_in || 0 !== o.lookahead || 0 !== t && 666 !== o.status) {
							var y = 2 === o.strategy ? function(e, t) {
								for (var r;;) {
									if (0 === e.lookahead && (x(e), 0 === e.lookahead)) {
										if (0 === t) return 1;
										break;
									}
									if (e.match_length = 0, r = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, r && (w(e, !1), 0 === e.strm.avail_out)) return 1;
								}
								return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
							}(o, t) : 3 === o.strategy ? function(e, t) {
								for (var r, n, o, a, s = e.window;;) {
									if (e.lookahead <= u) {
										if (x(e), e.lookahead <= u && 0 === t) return 1;
										if (0 === e.lookahead) break;
									}
									if (e.match_length = 0, e.lookahead >= 3 && 0 < e.strstart && (n = s[o = e.strstart - 1]) === s[++o] && n === s[++o] && n === s[++o]) {
										a = e.strstart + u;
										do										;
while (n === s[++o] && n === s[++o] && n === s[++o] && n === s[++o] && n === s[++o] && n === s[++o] && n === s[++o] && n === s[++o] && o < a);
										e.match_length = u - (a - o), e.match_length > e.lookahead && (e.match_length = e.lookahead);
									}
									if (e.match_length >= 3 ? (r = i._tr_tally(e, 1, e.match_length - 3), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (r = i._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), r && (w(e, !1), 0 === e.strm.avail_out)) return 1;
								}
								return e.insert = 0, 4 === t ? (w(e, !0), 0 === e.strm.avail_out ? 3 : 4) : e.last_lit && (w(e, !1), 0 === e.strm.avail_out) ? 1 : 2;
							}(o, t) : n[o.level].func(o, t);
							if (3 !== y && 4 !== y || (o.status = 666), 1 === y || 3 === y) return 0 === e.avail_out && (o.last_flush = -1), 0;
							if (2 === y && (1 === t ? i._tr_align(o) : 5 !== t && (i._tr_stored_block(o, 0, 0, !1), 3 === t && (m(o.head), 0 === o.lookahead && (o.strstart = 0, o.block_start = 0, o.insert = 0))), g(e), 0 === e.avail_out)) return o.last_flush = -1, 0;
						}
						return 4 !== t ? 0 : o.wrap <= 0 ? 1 : (2 === o.wrap ? (b(o, 255 & e.adler), b(o, e.adler >> 8 & 255), b(o, e.adler >> 16 & 255), b(o, e.adler >> 24 & 255), b(o, 255 & e.total_in), b(o, e.total_in >> 8 & 255), b(o, e.total_in >> 16 & 255), b(o, e.total_in >> 24 & 255)) : (v(o, e.adler >>> 16), v(o, 65535 & e.adler)), g(e), 0 < o.wrap && (o.wrap = -o.wrap), 0 !== o.pending ? 0 : 1);
					}, r.deflateEnd = function(e) {
						var t;
						return e && e.state ? 42 !== (t = e.state.status) && 69 !== t && 73 !== t && 91 !== t && 103 !== t && t !== p && 666 !== t ? f(e, c) : (e.state = null, t === p ? f(e, -3) : 0) : c;
					}, r.deflateSetDictionary = function(e, t) {
						var r, n, i, s, l, u, d, p, f = t.length;
						if (!e || !e.state) return c;
						if (2 === (s = (r = e.state).wrap) || 1 === s && 42 !== r.status || r.lookahead) return c;
						for (1 === s && (e.adler = a(e.adler, t, f, 0)), r.wrap = 0, f >= r.w_size && (0 === s && (m(r.head), r.strstart = 0, r.block_start = 0, r.insert = 0), p = new o.Buf8(r.w_size), o.arraySet(p, t, f - r.w_size, r.w_size, 0), t = p, f = r.w_size), l = e.avail_in, u = e.next_in, d = e.input, e.avail_in = f, e.next_in = 0, e.input = t, x(r); r.lookahead >= 3;) {
							for (n = r.strstart, i = r.lookahead - 2; r.ins_h = (r.ins_h << r.hash_shift ^ r.window[n + 3 - 1]) & r.hash_mask, r.prev[n & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = n, n++, --i;);
							r.strstart = n, r.lookahead = 2, x(r);
						}
						return r.strstart += r.lookahead, r.block_start = r.strstart, r.insert = r.lookahead, r.lookahead = 0, r.match_length = r.prev_length = 2, r.match_available = 0, e.next_in = u, e.input = d, e.avail_in = l, r.wrap = s, 0;
					}, r.deflateInfo = "pako deflate (from Nodeca project)";
				}, {
					"../utils/common": 41,
					"./adler32": 43,
					"./crc32": 45,
					"./messages": 51,
					"./trees": 52
				}],
				47: [function(e, t, r) {
					"use strict";
					t.exports = function() {
						this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
					};
				}, {}],
				48: [function(e, t, r) {
					"use strict";
					t.exports = function(e, t) {
						var r, n, o, i, a, s, l, c, u, d, p, f, h, m, g, w, b, v, y, x, E, S, N = e.state, k = e.next_in, _ = e.input;
						r = k + (e.avail_in - 5), n = e.next_out, S = e.output, o = n - (t - e.avail_out), i = n + (e.avail_out - 257), a = N.dmax, s = N.wsize, l = N.whave, c = N.wnext, u = N.window, d = N.hold, p = N.bits, f = N.lencode, h = N.distcode, m = (1 << N.lenbits) - 1, g = (1 << N.distbits) - 1;
						e: do {
							p < 15 && (d += _[k++] << p, p += 8, d += _[k++] << p, p += 8), w = f[d & m];
							t: for (;;) {
								if (d >>>= b = w >>> 24, p -= b, 0 == (b = w >>> 16 & 255)) S[n++] = 65535 & w;
								else {
									if (!(16 & b)) {
										if (!(64 & b)) {
											w = f[(65535 & w) + (d & (1 << b) - 1)];
											continue t;
										}
										if (32 & b) {
											N.mode = 12;
											break e;
										}
										e.msg = "invalid literal/length code", N.mode = 30;
										break e;
									}
									v = 65535 & w, (b &= 15) && (p < b && (d += _[k++] << p, p += 8), v += d & (1 << b) - 1, d >>>= b, p -= b), p < 15 && (d += _[k++] << p, p += 8, d += _[k++] << p, p += 8), w = h[d & g];
									r: for (;;) {
										if (d >>>= b = w >>> 24, p -= b, !(16 & (b = w >>> 16 & 255))) {
											if (!(64 & b)) {
												w = h[(65535 & w) + (d & (1 << b) - 1)];
												continue r;
											}
											e.msg = "invalid distance code", N.mode = 30;
											break e;
										}
										if (y = 65535 & w, p < (b &= 15) && (d += _[k++] << p, (p += 8) < b && (d += _[k++] << p, p += 8)), a < (y += d & (1 << b) - 1)) {
											e.msg = "invalid distance too far back", N.mode = 30;
											break e;
										}
										if (d >>>= b, p -= b, (b = n - o) < y) {
											if (l < (b = y - b) && N.sane) {
												e.msg = "invalid distance too far back", N.mode = 30;
												break e;
											}
											if (E = u, (x = 0) === c) {
												if (x += s - b, b < v) {
													for (v -= b; S[n++] = u[x++], --b;);
													x = n - y, E = S;
												}
											} else if (c < b) {
												if (x += s + c - b, (b -= c) < v) {
													for (v -= b; S[n++] = u[x++], --b;);
													if (x = 0, c < v) {
														for (v -= b = c; S[n++] = u[x++], --b;);
														x = n - y, E = S;
													}
												}
											} else if (x += c - b, b < v) {
												for (v -= b; S[n++] = u[x++], --b;);
												x = n - y, E = S;
											}
											for (; 2 < v;) S[n++] = E[x++], S[n++] = E[x++], S[n++] = E[x++], v -= 3;
											v && (S[n++] = E[x++], 1 < v && (S[n++] = E[x++]));
										} else {
											for (x = n - y; S[n++] = S[x++], S[n++] = S[x++], S[n++] = S[x++], 2 < (v -= 3););
											v && (S[n++] = S[x++], 1 < v && (S[n++] = S[x++]));
										}
										break;
									}
								}
								break;
							}
						} while (k < r && n < i);
						k -= v = p >> 3, d &= (1 << (p -= v << 3)) - 1, e.next_in = k, e.next_out = n, e.avail_in = k < r ? r - k + 5 : 5 - (k - r), e.avail_out = n < i ? i - n + 257 : 257 - (n - i), N.hold = d, N.bits = p;
					};
				}, {}],
				49: [function(e, t, r) {
					"use strict";
					var n = e("../utils/common"), o = e("./adler32"), i = e("./crc32"), a = e("./inffast"), s = e("./inftrees"), l = -2;
					function c(e) {
						return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((65280 & e) << 8) + ((255 & e) << 24);
					}
					function u() {
						this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new n.Buf16(320), this.work = new n.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
					}
					function d(e) {
						var t;
						return e && e.state ? (t = e.state, e.total_in = e.total_out = t.total = 0, e.msg = "", t.wrap && (e.adler = 1 & t.wrap), t.mode = 1, t.last = 0, t.havedict = 0, t.dmax = 32768, t.head = null, t.hold = 0, t.bits = 0, t.lencode = t.lendyn = new n.Buf32(852), t.distcode = t.distdyn = new n.Buf32(592), t.sane = 1, t.back = -1, 0) : l;
					}
					function p(e) {
						var t;
						return e && e.state ? ((t = e.state).wsize = 0, t.whave = 0, t.wnext = 0, d(e)) : l;
					}
					function f(e, t) {
						var r, n;
						return e && e.state ? (n = e.state, t < 0 ? (r = 0, t = -t) : (r = 1 + (t >> 4), t < 48 && (t &= 15)), t && (t < 8 || 15 < t) ? l : (null !== n.window && n.wbits !== t && (n.window = null), n.wrap = r, n.wbits = t, p(e))) : l;
					}
					function h(e, t) {
						var r, n;
						return e ? (n = new u(), (e.state = n).window = null, 0 !== (r = f(e, t)) && (e.state = null), r) : l;
					}
					var m, g, w = !0;
					function b(e) {
						if (w) {
							var t;
							for (m = new n.Buf32(512), g = new n.Buf32(32), t = 0; t < 144;) e.lens[t++] = 8;
							for (; t < 256;) e.lens[t++] = 9;
							for (; t < 280;) e.lens[t++] = 7;
							for (; t < 288;) e.lens[t++] = 8;
							for (s(1, e.lens, 0, 288, m, 0, e.work, { bits: 9 }), t = 0; t < 32;) e.lens[t++] = 5;
							s(2, e.lens, 0, 32, g, 0, e.work, { bits: 5 }), w = !1;
						}
						e.lencode = m, e.lenbits = 9, e.distcode = g, e.distbits = 5;
					}
					function v(e, t, r, o) {
						var i, a = e.state;
						return null === a.window && (a.wsize = 1 << a.wbits, a.wnext = 0, a.whave = 0, a.window = new n.Buf8(a.wsize)), o >= a.wsize ? (n.arraySet(a.window, t, r - a.wsize, a.wsize, 0), a.wnext = 0, a.whave = a.wsize) : (o < (i = a.wsize - a.wnext) && (i = o), n.arraySet(a.window, t, r - o, i, a.wnext), (o -= i) ? (n.arraySet(a.window, t, r - o, o, 0), a.wnext = o, a.whave = a.wsize) : (a.wnext += i, a.wnext === a.wsize && (a.wnext = 0), a.whave < a.wsize && (a.whave += i))), 0;
					}
					r.inflateReset = p, r.inflateReset2 = f, r.inflateResetKeep = d, r.inflateInit = function(e) {
						return h(e, 15);
					}, r.inflateInit2 = h, r.inflate = function(e, t) {
						var r, u, d, p, f, h, m, g, w, y, x, E, S, N, k, _, T, I, A, C, R, $, D, P, F = 0, M = new n.Buf8(4), O = [
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
						12 === (r = e.state).mode && (r.mode = 13), f = e.next_out, d = e.output, m = e.avail_out, p = e.next_in, u = e.input, h = e.avail_in, g = r.hold, w = r.bits, y = h, x = m, $ = 0;
						e: for (;;) switch (r.mode) {
							case 1:
								if (0 === r.wrap) {
									r.mode = 13;
									break;
								}
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (2 & r.wrap && 35615 === g) {
									M[r.check = 0] = 255 & g, M[1] = g >>> 8 & 255, r.check = i(r.check, M, 2, 0), w = g = 0, r.mode = 2;
									break;
								}
								if (r.flags = 0, r.head && (r.head.done = !1), !(1 & r.wrap) || (((255 & g) << 8) + (g >> 8)) % 31) {
									e.msg = "incorrect header check", r.mode = 30;
									break;
								}
								if (8 != (15 & g)) {
									e.msg = "unknown compression method", r.mode = 30;
									break;
								}
								if (w -= 4, R = 8 + (15 & (g >>>= 4)), 0 === r.wbits) r.wbits = R;
								else if (R > r.wbits) {
									e.msg = "invalid window size", r.mode = 30;
									break;
								}
								r.dmax = 1 << R, e.adler = r.check = 1, r.mode = 512 & g ? 10 : 12, w = g = 0;
								break;
							case 2:
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (r.flags = g, 8 != (255 & r.flags)) {
									e.msg = "unknown compression method", r.mode = 30;
									break;
								}
								if (57344 & r.flags) {
									e.msg = "unknown header flags set", r.mode = 30;
									break;
								}
								r.head && (r.head.text = g >> 8 & 1), 512 & r.flags && (M[0] = 255 & g, M[1] = g >>> 8 & 255, r.check = i(r.check, M, 2, 0)), w = g = 0, r.mode = 3;
							case 3:
								for (; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								r.head && (r.head.time = g), 512 & r.flags && (M[0] = 255 & g, M[1] = g >>> 8 & 255, M[2] = g >>> 16 & 255, M[3] = g >>> 24 & 255, r.check = i(r.check, M, 4, 0)), w = g = 0, r.mode = 4;
							case 4:
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								r.head && (r.head.xflags = 255 & g, r.head.os = g >> 8), 512 & r.flags && (M[0] = 255 & g, M[1] = g >>> 8 & 255, r.check = i(r.check, M, 2, 0)), w = g = 0, r.mode = 5;
							case 5:
								if (1024 & r.flags) {
									for (; w < 16;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									r.length = g, r.head && (r.head.extra_len = g), 512 & r.flags && (M[0] = 255 & g, M[1] = g >>> 8 & 255, r.check = i(r.check, M, 2, 0)), w = g = 0;
								} else r.head && (r.head.extra = null);
								r.mode = 6;
							case 6:
								if (1024 & r.flags && (h < (E = r.length) && (E = h), E && (r.head && (R = r.head.extra_len - r.length, r.head.extra || (r.head.extra = new Array(r.head.extra_len)), n.arraySet(r.head.extra, u, p, E, R)), 512 & r.flags && (r.check = i(r.check, u, E, p)), h -= E, p += E, r.length -= E), r.length)) break e;
								r.length = 0, r.mode = 7;
							case 7:
								if (2048 & r.flags) {
									if (0 === h) break e;
									for (E = 0; R = u[p + E++], r.head && R && r.length < 65536 && (r.head.name += String.fromCharCode(R)), R && E < h;);
									if (512 & r.flags && (r.check = i(r.check, u, E, p)), h -= E, p += E, R) break e;
								} else r.head && (r.head.name = null);
								r.length = 0, r.mode = 8;
							case 8:
								if (4096 & r.flags) {
									if (0 === h) break e;
									for (E = 0; R = u[p + E++], r.head && R && r.length < 65536 && (r.head.comment += String.fromCharCode(R)), R && E < h;);
									if (512 & r.flags && (r.check = i(r.check, u, E, p)), h -= E, p += E, R) break e;
								} else r.head && (r.head.comment = null);
								r.mode = 9;
							case 9:
								if (512 & r.flags) {
									for (; w < 16;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (g !== (65535 & r.check)) {
										e.msg = "header crc mismatch", r.mode = 30;
										break;
									}
									w = g = 0;
								}
								r.head && (r.head.hcrc = r.flags >> 9 & 1, r.head.done = !0), e.adler = r.check = 0, r.mode = 12;
								break;
							case 10:
								for (; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								e.adler = r.check = c(g), w = g = 0, r.mode = 11;
							case 11:
								if (0 === r.havedict) return e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, r.hold = g, r.bits = w, 2;
								e.adler = r.check = 1, r.mode = 12;
							case 12: if (5 === t || 6 === t) break e;
							case 13:
								if (r.last) {
									g >>>= 7 & w, w -= 7 & w, r.mode = 27;
									break;
								}
								for (; w < 3;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								switch (r.last = 1 & g, w -= 1, 3 & (g >>>= 1)) {
									case 0:
										r.mode = 14;
										break;
									case 1:
										if (b(r), r.mode = 20, 6 !== t) break;
										g >>>= 2, w -= 2;
										break e;
									case 2:
										r.mode = 17;
										break;
									case 3: e.msg = "invalid block type", r.mode = 30;
								}
								g >>>= 2, w -= 2;
								break;
							case 14:
								for (g >>>= 7 & w, w -= 7 & w; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if ((65535 & g) != (g >>> 16 ^ 65535)) {
									e.msg = "invalid stored block lengths", r.mode = 30;
									break;
								}
								if (r.length = 65535 & g, w = g = 0, r.mode = 15, 6 === t) break e;
							case 15: r.mode = 16;
							case 16:
								if (E = r.length) {
									if (h < E && (E = h), m < E && (E = m), 0 === E) break e;
									n.arraySet(d, u, p, E, f), h -= E, p += E, m -= E, f += E, r.length -= E;
									break;
								}
								r.mode = 12;
								break;
							case 17:
								for (; w < 14;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (r.nlen = 257 + (31 & g), g >>>= 5, w -= 5, r.ndist = 1 + (31 & g), g >>>= 5, w -= 5, r.ncode = 4 + (15 & g), g >>>= 4, w -= 4, 286 < r.nlen || 30 < r.ndist) {
									e.msg = "too many length or distance symbols", r.mode = 30;
									break;
								}
								r.have = 0, r.mode = 18;
							case 18:
								for (; r.have < r.ncode;) {
									for (; w < 3;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									r.lens[O[r.have++]] = 7 & g, g >>>= 3, w -= 3;
								}
								for (; r.have < 19;) r.lens[O[r.have++]] = 0;
								if (r.lencode = r.lendyn, r.lenbits = 7, D = { bits: r.lenbits }, $ = s(0, r.lens, 0, 19, r.lencode, 0, r.work, D), r.lenbits = D.bits, $) {
									e.msg = "invalid code lengths set", r.mode = 30;
									break;
								}
								r.have = 0, r.mode = 19;
							case 19:
								for (; r.have < r.nlen + r.ndist;) {
									for (; _ = (F = r.lencode[g & (1 << r.lenbits) - 1]) >>> 16 & 255, T = 65535 & F, !((k = F >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (T < 16) g >>>= k, w -= k, r.lens[r.have++] = T;
									else {
										if (16 === T) {
											for (P = k + 2; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											if (g >>>= k, w -= k, 0 === r.have) {
												e.msg = "invalid bit length repeat", r.mode = 30;
												break;
											}
											R = r.lens[r.have - 1], E = 3 + (3 & g), g >>>= 2, w -= 2;
										} else if (17 === T) {
											for (P = k + 3; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											w -= k, R = 0, E = 3 + (7 & (g >>>= k)), g >>>= 3, w -= 3;
										} else {
											for (P = k + 7; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											w -= k, R = 0, E = 11 + (127 & (g >>>= k)), g >>>= 7, w -= 7;
										}
										if (r.have + E > r.nlen + r.ndist) {
											e.msg = "invalid bit length repeat", r.mode = 30;
											break;
										}
										for (; E--;) r.lens[r.have++] = R;
									}
								}
								if (30 === r.mode) break;
								if (0 === r.lens[256]) {
									e.msg = "invalid code -- missing end-of-block", r.mode = 30;
									break;
								}
								if (r.lenbits = 9, D = { bits: r.lenbits }, $ = s(1, r.lens, 0, r.nlen, r.lencode, 0, r.work, D), r.lenbits = D.bits, $) {
									e.msg = "invalid literal/lengths set", r.mode = 30;
									break;
								}
								if (r.distbits = 6, r.distcode = r.distdyn, D = { bits: r.distbits }, $ = s(2, r.lens, r.nlen, r.ndist, r.distcode, 0, r.work, D), r.distbits = D.bits, $) {
									e.msg = "invalid distances set", r.mode = 30;
									break;
								}
								if (r.mode = 20, 6 === t) break e;
							case 20: r.mode = 21;
							case 21:
								if (6 <= h && 258 <= m) {
									e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, r.hold = g, r.bits = w, a(e, x), f = e.next_out, d = e.output, m = e.avail_out, p = e.next_in, u = e.input, h = e.avail_in, g = r.hold, w = r.bits, 12 === r.mode && (r.back = -1);
									break;
								}
								for (r.back = 0; _ = (F = r.lencode[g & (1 << r.lenbits) - 1]) >>> 16 & 255, T = 65535 & F, !((k = F >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (_ && !(240 & _)) {
									for (I = k, A = _, C = T; _ = (F = r.lencode[C + ((g & (1 << I + A) - 1) >> I)]) >>> 16 & 255, T = 65535 & F, !(I + (k = F >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= I, w -= I, r.back += I;
								}
								if (g >>>= k, w -= k, r.back += k, r.length = T, 0 === _) {
									r.mode = 26;
									break;
								}
								if (32 & _) {
									r.back = -1, r.mode = 12;
									break;
								}
								if (64 & _) {
									e.msg = "invalid literal/length code", r.mode = 30;
									break;
								}
								r.extra = 15 & _, r.mode = 22;
							case 22:
								if (r.extra) {
									for (P = r.extra; w < P;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									r.length += g & (1 << r.extra) - 1, g >>>= r.extra, w -= r.extra, r.back += r.extra;
								}
								r.was = r.length, r.mode = 23;
							case 23:
								for (; _ = (F = r.distcode[g & (1 << r.distbits) - 1]) >>> 16 & 255, T = 65535 & F, !((k = F >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (!(240 & _)) {
									for (I = k, A = _, C = T; _ = (F = r.distcode[C + ((g & (1 << I + A) - 1) >> I)]) >>> 16 & 255, T = 65535 & F, !(I + (k = F >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= I, w -= I, r.back += I;
								}
								if (g >>>= k, w -= k, r.back += k, 64 & _) {
									e.msg = "invalid distance code", r.mode = 30;
									break;
								}
								r.offset = T, r.extra = 15 & _, r.mode = 24;
							case 24:
								if (r.extra) {
									for (P = r.extra; w < P;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									r.offset += g & (1 << r.extra) - 1, g >>>= r.extra, w -= r.extra, r.back += r.extra;
								}
								if (r.offset > r.dmax) {
									e.msg = "invalid distance too far back", r.mode = 30;
									break;
								}
								r.mode = 25;
							case 25:
								if (0 === m) break e;
								if (E = x - m, r.offset > E) {
									if ((E = r.offset - E) > r.whave && r.sane) {
										e.msg = "invalid distance too far back", r.mode = 30;
										break;
									}
									S = E > r.wnext ? (E -= r.wnext, r.wsize - E) : r.wnext - E, E > r.length && (E = r.length), N = r.window;
								} else N = d, S = f - r.offset, E = r.length;
								for (m < E && (E = m), m -= E, r.length -= E; d[f++] = N[S++], --E;);
								0 === r.length && (r.mode = 21);
								break;
							case 26:
								if (0 === m) break e;
								d[f++] = r.length, m--, r.mode = 21;
								break;
							case 27:
								if (r.wrap) {
									for (; w < 32;) {
										if (0 === h) break e;
										h--, g |= u[p++] << w, w += 8;
									}
									if (x -= m, e.total_out += x, r.total += x, x && (e.adler = r.check = r.flags ? i(r.check, d, x, f - x) : o(r.check, d, x, f - x)), x = m, (r.flags ? g : c(g)) !== r.check) {
										e.msg = "incorrect data check", r.mode = 30;
										break;
									}
									w = g = 0;
								}
								r.mode = 28;
							case 28:
								if (r.wrap && r.flags) {
									for (; w < 32;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (g !== (4294967295 & r.total)) {
										e.msg = "incorrect length check", r.mode = 30;
										break;
									}
									w = g = 0;
								}
								r.mode = 29;
							case 29:
								$ = 1;
								break e;
							case 30:
								$ = -3;
								break e;
							case 31: return -4;
							default: return l;
						}
						return e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, r.hold = g, r.bits = w, (r.wsize || x !== e.avail_out && r.mode < 30 && (r.mode < 27 || 4 !== t)) && v(e, e.output, e.next_out, x - e.avail_out) ? (r.mode = 31, -4) : (y -= e.avail_in, x -= e.avail_out, e.total_in += y, e.total_out += x, r.total += x, r.wrap && x && (e.adler = r.check = r.flags ? i(r.check, d, x, e.next_out - x) : o(r.check, d, x, e.next_out - x)), e.data_type = r.bits + (r.last ? 64 : 0) + (12 === r.mode ? 128 : 0) + (20 === r.mode || 15 === r.mode ? 256 : 0), (0 == y && 0 === x || 4 === t) && 0 === $ && ($ = -5), $);
					}, r.inflateEnd = function(e) {
						if (!e || !e.state) return l;
						var t = e.state;
						return t.window && (t.window = null), e.state = null, 0;
					}, r.inflateGetHeader = function(e, t) {
						var r;
						return e && e.state && 2 & (r = e.state).wrap ? ((r.head = t).done = !1, 0) : l;
					}, r.inflateSetDictionary = function(e, t) {
						var r, n = t.length;
						return e && e.state ? 0 !== (r = e.state).wrap && 11 !== r.mode ? l : 11 === r.mode && o(1, t, n, 0) !== r.check ? -3 : v(e, t, n, n) ? (r.mode = 31, -4) : (r.havedict = 1, 0) : l;
					}, r.inflateInfo = "pako inflate (from Nodeca project)";
				}, {
					"../utils/common": 41,
					"./adler32": 43,
					"./crc32": 45,
					"./inffast": 48,
					"./inftrees": 50
				}],
				50: [function(e, t, r) {
					"use strict";
					var n = e("../utils/common"), o = [
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
					t.exports = function(e, t, r, l, c, u, d, p) {
						var f, h, m, g, w, b, v, y, x, E = p.bits, S = 0, N = 0, k = 0, _ = 0, T = 0, I = 0, A = 0, C = 0, R = 0, $ = 0, D = null, P = 0, F = new n.Buf16(16), M = new n.Buf16(16), O = null, L = 0;
						for (S = 0; S <= 15; S++) F[S] = 0;
						for (N = 0; N < l; N++) F[t[r + N]]++;
						for (T = E, _ = 15; 1 <= _ && 0 === F[_]; _--);
						if (_ < T && (T = _), 0 === _) return c[u++] = 20971520, c[u++] = 20971520, p.bits = 1, 0;
						for (k = 1; k < _ && 0 === F[k]; k++);
						for (T < k && (T = k), S = C = 1; S <= 15; S++) if (C <<= 1, (C -= F[S]) < 0) return -1;
						if (0 < C && (0 === e || 1 !== _)) return -1;
						for (M[1] = 0, S = 1; S < 15; S++) M[S + 1] = M[S] + F[S];
						for (N = 0; N < l; N++) 0 !== t[r + N] && (d[M[t[r + N]]++] = N);
						if (b = 0 === e ? (D = O = d, 19) : 1 === e ? (D = o, P -= 257, O = i, L -= 257, 256) : (D = a, O = s, -1), S = k, w = u, A = N = $ = 0, m = -1, g = (R = 1 << (I = T)) - 1, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
						for (;;) {
							for (v = S - A, x = d[N] < b ? (y = 0, d[N]) : d[N] > b ? (y = O[L + d[N]], D[P + d[N]]) : (y = 96, 0), f = 1 << S - A, k = h = 1 << I; c[w + ($ >> A) + (h -= f)] = v << 24 | y << 16 | x, 0 !== h;);
							for (f = 1 << S - 1; $ & f;) f >>= 1;
							if (0 !== f ? ($ &= f - 1, $ += f) : $ = 0, N++, 0 == --F[S]) {
								if (S === _) break;
								S = t[r + d[N]];
							}
							if (T < S && ($ & g) !== m) {
								for (0 === A && (A = T), w += k, C = 1 << (I = S - A); I + A < _ && !((C -= F[I + A]) <= 0);) I++, C <<= 1;
								if (R += 1 << I, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
								c[m = $ & g] = T << 24 | I << 16 | w - u;
							}
						}
						return 0 !== $ && (c[w + $] = S - A << 24 | 4194304), p.bits = T, 0;
					};
				}, { "../utils/common": 41 }],
				51: [function(e, t, r) {
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
				52: [function(e, t, r) {
					"use strict";
					var n = e("../utils/common");
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
					function E(e, t, r, n, o) {
						this.static_tree = e, this.extra_bits = t, this.extra_base = r, this.elems = n, this.max_length = o, this.has_stree = e && e.length;
					}
					function S(e, t) {
						this.dyn_tree = e, this.max_code = 0, this.stat_desc = t;
					}
					function N(e) {
						return e < 256 ? m[e] : m[256 + (e >>> 7)];
					}
					function k(e, t) {
						e.pending_buf[e.pending++] = 255 & t, e.pending_buf[e.pending++] = t >>> 8 & 255;
					}
					function _(e, t, r) {
						e.bi_valid > 16 - r ? (e.bi_buf |= t << e.bi_valid & 65535, k(e, e.bi_buf), e.bi_buf = t >> 16 - e.bi_valid, e.bi_valid += r - 16) : (e.bi_buf |= t << e.bi_valid & 65535, e.bi_valid += r);
					}
					function T(e, t, r) {
						_(e, r[2 * t], r[2 * t + 1]);
					}
					function I(e, t) {
						for (var r = 0; r |= 1 & e, e >>>= 1, r <<= 1, 0 < --t;);
						return r >>> 1;
					}
					function A(e, t, r) {
						var n, o, i = new Array(16), a = 0;
						for (n = 1; n <= l; n++) i[n] = a = a + r[n - 1] << 1;
						for (o = 0; o <= t; o++) {
							var s = e[2 * o + 1];
							0 !== s && (e[2 * o] = I(i[s]++, s));
						}
					}
					function C(e) {
						for (var t = 0; t < a; t++) e.dyn_ltree[2 * t] = 0;
						for (t = 0; t < s; t++) e.dyn_dtree[2 * t] = 0;
						for (t = 0; t < 19; t++) e.bl_tree[2 * t] = 0;
						e.dyn_ltree[512] = 1, e.opt_len = e.static_len = 0, e.last_lit = e.matches = 0;
					}
					function R(e) {
						8 < e.bi_valid ? k(e, e.bi_buf) : 0 < e.bi_valid && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
					}
					function $(e, t, r, n) {
						var o = 2 * t, i = 2 * r;
						return e[o] < e[i] || e[o] === e[i] && n[t] <= n[r];
					}
					function D(e, t, r) {
						for (var n = e.heap[r], o = r << 1; o <= e.heap_len && (o < e.heap_len && $(t, e.heap[o + 1], e.heap[o], e.depth) && o++, !$(t, n, e.heap[o], e.depth));) e.heap[r] = e.heap[o], r = o, o <<= 1;
						e.heap[r] = n;
					}
					function P(e, t, r) {
						var n, o, a, s, l = 0;
						if (0 !== e.last_lit) for (; n = e.pending_buf[e.d_buf + 2 * l] << 8 | e.pending_buf[e.d_buf + 2 * l + 1], o = e.pending_buf[e.l_buf + l], l++, 0 === n ? T(e, o, t) : (T(e, (a = g[o]) + i + 1, t), 0 !== (s = c[a]) && _(e, o -= w[a], s), T(e, a = N(--n), r), 0 !== (s = u[a]) && _(e, n -= x[a], s)), l < e.last_lit;);
						T(e, 256, t);
					}
					function F(e, t) {
						var r, n, o, i = t.dyn_tree, a = t.stat_desc.static_tree, s = t.stat_desc.has_stree, c = t.stat_desc.elems, u = -1;
						for (e.heap_len = 0, e.heap_max = 573, r = 0; r < c; r++) 0 !== i[2 * r] ? (e.heap[++e.heap_len] = u = r, e.depth[r] = 0) : i[2 * r + 1] = 0;
						for (; e.heap_len < 2;) i[2 * (o = e.heap[++e.heap_len] = u < 2 ? ++u : 0)] = 1, e.depth[o] = 0, e.opt_len--, s && (e.static_len -= a[2 * o + 1]);
						for (t.max_code = u, r = e.heap_len >> 1; 1 <= r; r--) D(e, i, r);
						for (o = c; r = e.heap[1], e.heap[1] = e.heap[e.heap_len--], D(e, i, 1), n = e.heap[1], e.heap[--e.heap_max] = r, e.heap[--e.heap_max] = n, i[2 * o] = i[2 * r] + i[2 * n], e.depth[o] = (e.depth[r] >= e.depth[n] ? e.depth[r] : e.depth[n]) + 1, i[2 * r + 1] = i[2 * n + 1] = o, e.heap[1] = o++, D(e, i, 1), 2 <= e.heap_len;);
						e.heap[--e.heap_max] = e.heap[1], function(e, t) {
							var r, n, o, i, a, s, c = t.dyn_tree, u = t.max_code, d = t.stat_desc.static_tree, p = t.stat_desc.has_stree, f = t.stat_desc.extra_bits, h = t.stat_desc.extra_base, m = t.stat_desc.max_length, g = 0;
							for (i = 0; i <= l; i++) e.bl_count[i] = 0;
							for (c[2 * e.heap[e.heap_max] + 1] = 0, r = e.heap_max + 1; r < 573; r++) m < (i = c[2 * c[2 * (n = e.heap[r]) + 1] + 1] + 1) && (i = m, g++), c[2 * n + 1] = i, u < n || (e.bl_count[i]++, a = 0, h <= n && (a = f[n - h]), s = c[2 * n], e.opt_len += s * (i + a), p && (e.static_len += s * (d[2 * n + 1] + a)));
							if (0 !== g) {
								do {
									for (i = m - 1; 0 === e.bl_count[i];) i--;
									e.bl_count[i]--, e.bl_count[i + 1] += 2, e.bl_count[m]--, g -= 2;
								} while (0 < g);
								for (i = m; 0 !== i; i--) for (n = e.bl_count[i]; 0 !== n;) u < (o = e.heap[--r]) || (c[2 * o + 1] !== i && (e.opt_len += (i - c[2 * o + 1]) * c[2 * o], c[2 * o + 1] = i), n--);
							}
						}(e, t), A(i, u, e.bl_count);
					}
					function M(e, t, r) {
						var n, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), t[2 * (r + 1) + 1] = 65535, n = 0; n <= r; n++) o = a, a = t[2 * (n + 1) + 1], ++s < l && o === a || (s < c ? e.bl_tree[2 * o] += s : 0 !== o ? (o !== i && e.bl_tree[2 * o]++, e.bl_tree[32]++) : s <= 10 ? e.bl_tree[34]++ : e.bl_tree[36]++, i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4));
					}
					function O(e, t, r) {
						var n, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), n = 0; n <= r; n++) if (o = a, a = t[2 * (n + 1) + 1], !(++s < l && o === a)) {
							if (s < c) for (; T(e, o, e.bl_tree), 0 != --s;);
							else 0 !== o ? (o !== i && (T(e, o, e.bl_tree), s--), T(e, 16, e.bl_tree), _(e, s - 3, 2)) : s <= 10 ? (T(e, 17, e.bl_tree), _(e, s - 3, 3)) : (T(e, 18, e.bl_tree), _(e, s - 11, 7));
							i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4);
						}
					}
					o(x);
					var L = !1;
					function B(e, t, r, o) {
						_(e, 0 + (o ? 1 : 0), 3), function(e, t, r) {
							R(e), k(e, r), k(e, ~r), n.arraySet(e.pending_buf, e.window, t, r, e.pending), e.pending += r;
						}(e, t, r);
					}
					r._tr_init = function(e) {
						L || (function() {
							var e, t, r, n, o, i = new Array(16);
							for (n = r = 0; n < 28; n++) for (w[n] = r, e = 0; e < 1 << c[n]; e++) g[r++] = n;
							for (g[r - 1] = n, n = o = 0; n < 16; n++) for (x[n] = o, e = 0; e < 1 << u[n]; e++) m[o++] = n;
							for (o >>= 7; n < s; n++) for (x[n] = o << 7, e = 0; e < 1 << u[n] - 7; e++) m[256 + o++] = n;
							for (t = 0; t <= l; t++) i[t] = 0;
							for (e = 0; e <= 143;) f[2 * e + 1] = 8, e++, i[8]++;
							for (; e <= 255;) f[2 * e + 1] = 9, e++, i[9]++;
							for (; e <= 279;) f[2 * e + 1] = 7, e++, i[7]++;
							for (; e <= 287;) f[2 * e + 1] = 8, e++, i[8]++;
							for (A(f, 287, i), e = 0; e < s; e++) h[2 * e + 1] = 5, h[2 * e] = I(e, 5);
							b = new E(f, c, 257, a, l), v = new E(h, u, 0, s, l), y = new E(new Array(0), d, 0, 19, 7);
						}(), L = !0), e.l_desc = new S(e.dyn_ltree, b), e.d_desc = new S(e.dyn_dtree, v), e.bl_desc = new S(e.bl_tree, y), e.bi_buf = 0, e.bi_valid = 0, C(e);
					}, r._tr_stored_block = B, r._tr_flush_block = function(e, t, r, n) {
						var o, a, s = 0;
						0 < e.level ? (2 === e.strm.data_type && (e.strm.data_type = function(e) {
							var t, r = 4093624447;
							for (t = 0; t <= 31; t++, r >>>= 1) if (1 & r && 0 !== e.dyn_ltree[2 * t]) return 0;
							if (0 !== e.dyn_ltree[18] || 0 !== e.dyn_ltree[20] || 0 !== e.dyn_ltree[26]) return 1;
							for (t = 32; t < i; t++) if (0 !== e.dyn_ltree[2 * t]) return 1;
							return 0;
						}(e)), F(e, e.l_desc), F(e, e.d_desc), s = function(e) {
							var t;
							for (M(e, e.dyn_ltree, e.l_desc.max_code), M(e, e.dyn_dtree, e.d_desc.max_code), F(e, e.bl_desc), t = 18; 3 <= t && 0 === e.bl_tree[2 * p[t] + 1]; t--);
							return e.opt_len += 3 * (t + 1) + 5 + 5 + 4, t;
						}(e), o = e.opt_len + 3 + 7 >>> 3, (a = e.static_len + 3 + 7 >>> 3) <= o && (o = a)) : o = a = r + 5, r + 4 <= o && -1 !== t ? B(e, t, r, n) : 4 === e.strategy || a === o ? (_(e, 2 + (n ? 1 : 0), 3), P(e, f, h)) : (_(e, 4 + (n ? 1 : 0), 3), function(e, t, r, n) {
							var o;
							for (_(e, t - 257, 5), _(e, r - 1, 5), _(e, n - 4, 4), o = 0; o < n; o++) _(e, e.bl_tree[2 * p[o] + 1], 3);
							O(e, e.dyn_ltree, t - 1), O(e, e.dyn_dtree, r - 1);
						}(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, s + 1), P(e, e.dyn_ltree, e.dyn_dtree)), C(e), n && R(e);
					}, r._tr_tally = function(e, t, r) {
						return e.pending_buf[e.d_buf + 2 * e.last_lit] = t >>> 8 & 255, e.pending_buf[e.d_buf + 2 * e.last_lit + 1] = 255 & t, e.pending_buf[e.l_buf + e.last_lit] = 255 & r, e.last_lit++, 0 === t ? e.dyn_ltree[2 * r]++ : (e.matches++, t--, e.dyn_ltree[2 * (g[r] + i + 1)]++, e.dyn_dtree[2 * N(t)]++), e.last_lit === e.lit_bufsize - 1;
					}, r._tr_align = function(e) {
						_(e, 2, 3), T(e, 256, f), function(e) {
							16 === e.bi_valid ? (k(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : 8 <= e.bi_valid && (e.pending_buf[e.pending++] = 255 & e.bi_buf, e.bi_buf >>= 8, e.bi_valid -= 8);
						}(e);
					};
				}, { "../utils/common": 41 }],
				53: [function(e, t, r) {
					"use strict";
					t.exports = function() {
						this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
					};
				}, {}],
				54: [function(e, t, r) {
					(function(e) {
						(function(e) {
							"use strict";
							if (!e.setImmediate) {
								var t, r, n, o, i = 1, a = {}, s = !1, l = e.document, c = Object.getPrototypeOf && Object.getPrototypeOf(e);
								c = c && c.setTimeout ? c : e, t = "[object process]" === {}.toString.call(e.process) ? function(e) {
									process.nextTick(function() {
										d(e);
									});
								} : function() {
									if (e.postMessage && !e.importScripts) {
										var t = !0, r = e.onmessage;
										return e.onmessage = function() {
											t = !1;
										}, e.postMessage("", "*"), e.onmessage = r, t;
									}
								}() ? (o = "setImmediate$" + Math.random() + "$", e.addEventListener ? e.addEventListener("message", p, !1) : e.attachEvent("onmessage", p), function(t) {
									e.postMessage(o + t, "*");
								}) : e.MessageChannel ? ((n = new MessageChannel()).port1.onmessage = function(e) {
									d(e.data);
								}, function(e) {
									n.port2.postMessage(e);
								}) : l && "onreadystatechange" in l.createElement("script") ? (r = l.documentElement, function(e) {
									var t = l.createElement("script");
									t.onreadystatechange = function() {
										d(e), t.onreadystatechange = null, r.removeChild(t), t = null;
									}, r.appendChild(t);
								}) : function(e) {
									setTimeout(d, 0, e);
								}, c.setImmediate = function(e) {
									"function" != typeof e && (e = new Function("" + e));
									for (var r = new Array(arguments.length - 1), n = 0; n < r.length; n++) r[n] = arguments[n + 1];
									return a[i] = {
										callback: e,
										args: r
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
												var t = e.callback, r = e.args;
												switch (r.length) {
													case 0:
														t();
														break;
													case 1:
														t(r[0]);
														break;
													case 2:
														t(r[0], r[1]);
														break;
													case 3:
														t(r[0], r[1], r[2]);
														break;
													default: t.apply(void 0, r);
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
		function r(e, t) {
			return Object.prototype.hasOwnProperty.call(e, t);
		}
		var n = t({
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
			for (var n in t) r(t, n) && (e[n] = t[n]);
			return e;
		}, e.find = function(e, t, n) {
			if (void 0 === n && (n = Array.prototype), e && "function" == typeof n.find) return n.find.call(e, t);
			for (var o = 0; o < e.length; o++) if (r(e, o)) {
				var i = e[o];
				if (t.call(void 0, i, o, e)) return i;
			}
		}, e.freeze = t, e.HTML_BOOLEAN_ATTRIBUTES = n, e.HTML_RAW_TEXT_ELEMENTS = i, e.HTML_VOID_ELEMENTS = o, e.hasDefaultHTMLNamespace = function(e) {
			return a(e) || e === s.XML_XHTML_APPLICATION;
		}, e.hasOwn = r, e.isHTMLBooleanAttribute = function(e) {
			return r(n, e.toLowerCase());
		}, e.isHTMLRawTextElement = function(e) {
			var t = e.toLowerCase();
			return r(i, t) && !i[t];
		}, e.isHTMLEscapableRawTextElement = function(e) {
			var t = e.toLowerCase();
			return r(i, t) && i[t];
		}, e.isHTMLMimeType = a, e.isHTMLVoidElement = function(e) {
			return r(o, e.toLowerCase());
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
		var r = c().freeze({
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
		}), n = Object.keys(r);
		function o(e) {
			return "number" == typeof e && e >= 1 && e <= 25;
		}
		function i(e, t) {
			o(e) ? (this.name = n[e], this.message = t || "") : (this.message = e, this.name = function(e) {
				return "string" == typeof e && e.substring(e.length - r.Error.length) === r.Error;
			}(t) ? t : r.Error), Error.captureStackTrace && Error.captureStackTrace(this, i);
		}
		t(i, !0), Object.defineProperties(i.prototype, { code: {
			enumerable: !0,
			get: function() {
				var e = n.indexOf(this.name);
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
		function u(e, t, r) {
			this.message = e, this.locator = t, this.cause = r, Error.captureStackTrace && Error.captureStackTrace(this, u);
		}
		t(u), e.DOMException = i, e.DOMExceptionName = r, e.ExceptionCode = a, e.ParseError = u;
	}), d = a((e) => {
		function t(e) {
			try {
				"function" != typeof e && (e = RegExp);
				var t = new e("𝌆", "u").exec("𝌆");
				return !!t && 2 === t[0].length;
			} catch (r) {}
			return !1;
		}
		var r = t();
		function n(e) {
			if ("[" !== e.source[0]) throw new Error(e + " can not be used with chars");
			return e.source.slice(1, e.source.lastIndexOf("]"));
		}
		function o(e, t) {
			if ("[" !== e.source[0]) throw new Error("/" + e.source + "/ can not be used with chars_without");
			if (!t || "string" != typeof t) throw new Error(JSON.stringify(t) + " is not a valid search");
			if (-1 === e.source.indexOf(t)) throw new Error("\"" + t + "\" is not is /" + e.source + "/");
			if ("-" === t && 1 !== e.source.indexOf(t)) throw new Error("\"" + t + "\" is not at the first postion of /" + e.source + "/");
			return new RegExp(e.source.replace(t, ""), r ? "u" : "");
		}
		function i(e) {
			var t = this;
			return new RegExp(Array.prototype.slice.call(arguments).map(function(e) {
				var r = "string" == typeof e;
				if (r && void 0 === t && "|" === e) throw new Error("use regg instead of reg to wrap expressions with `|`!");
				return r ? e : e.source;
			}).join(""), r ? "u" : "");
		}
		function a(e) {
			if (0 === arguments.length) throw new Error("no parameters provided");
			return i.apply(a, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
		}
		var s = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
		r && (s = i("[", n(s), "\\u{10000}-\\u{10FFFF}", "]"));
		var l = new RegExp("[^" + n(s) + "]", r ? "u" : ""), c = /[\x20\x09\x0D\x0A]/, u = n(c), d = i(c, "+"), p = i(c, "*"), f = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
		r && (f = i("[", n(f), "\\u{10000}-\\u{10FFFF}", "]"));
		var h = i("[", n(f), n(/[-.0-9\xB7]/), n(/[\u0300-\u036F\u203F-\u2040]/), "]"), m = i(f, h, "*"), g = i("^", m, "$"), w = i(h, "+"), b = a(i("&", m, ";"), "|", a(/&#[0-9]+;|&#x[0-9a-fA-F]+;/)), v = i("%", m, ";"), y = a(i("\"", a(/[^%&"]/, "|", v, "|", b), "*", "\""), "|", i("'", a(/[^%&']/, "|", v, "|", b), "*", "'")), x = a("\"", a(/[^<&"]/, "|", b), "*", "\"", "|", "'", a(/[^<&']/, "|", b), "*", "'"), E = i(o(f, ":"), o(h, ":"), "*"), S = i("^", E, "$"), N = i(E, a(":", E), "?"), k = i("^", N, "$"), _ = i("(", N, ")"), T = a(/"[^"]*"|'[^']*'/), I = i(/^<\?/, "(", m, ")", a(d, "(?!", c, ")(", s, "*?)"), "?", /\?>/), A = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/, C = a("\"", A, "*\"", "|", "'", o(A, "'"), "*'"), R = "<!--", $ = i(R, a(o(s, "-"), "|", i("-", o(s, "-"))), "*", "-->"), D = "#PCDATA", P = a("EMPTY", "|", "ANY", "|", a(i(/\(/, p, D, a(p, /\|/, p, N), "*", p, /\)\*/), "|", i(/\(/, p, D, p, /\)/)), "|", i(/\([^>]+\)/, /[?*+]?/)), F = i("<!ELEMENT", d, a(N, "|", v), d, a(P, "|", v), p, ">"), M = i("<!ATTLIST", d, m, a(d, m, d, a(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", a(i("NOTATION", d, /\(/, p, m, a(p, /\|/, p, m), "*", p, /\)/), "|", i(/\(/, p, w, a(p, /\|/, p, w), "*", p, /\)/))), d, a(/#REQUIRED|#IMPLIED/, "|", a(a("#FIXED", d), "?", x))), "*", p, ">"), O = "about:legacy-compat", L = a("\"" + O + "\"", "|", "'" + O + "'"), B = "SYSTEM", U = "PUBLIC", z = a(a(B, d, T), "|", a(U, d, C, d, T)), H = i("^", a(a(B, d, "(?<SystemLiteralOnly>", T, ")"), "|", a(U, d, "(?<PubidLiteral>", C, ")", d, "(?<SystemLiteral>", T, ")"))), j = i("^", C, "$"), q = i("^", T, "$"), W = a(y, "|", a(z, a(d, "NDATA", d, m), "?")), G = "<!ENTITY", V = a(i(G, d, m, d, W, p, ">"), "|", i(G, d, "%", d, m, d, a(y, "|", z), p, ">")), X = i("<!NOTATION", d, m, d, a(z, "|", i(U, d, C)), p, ">"), Z = i(p, "=", p), Y = /1[.]\d+/, Q = i(d, "version", Z, a("'", Y, "'", "|", "\"", Y, "\"")), K = /[A-Za-z][-A-Za-z0-9._]*/, J = i(/^<\?xml/, Q, a(d, "encoding", Z, a("\"", K, "\"", "|", "'", K, "'")), "?", a(d, "standalone", Z, a("'", a("yes", "|", "no"), "'", "|", "\"", a("yes", "|", "no"), "\"")), "?", p, /\?>/), ee = i(/<!\[CDATA\[/, i(s, "*?", /\]\]>/));
		e.chars = n, e.chars_without = o, e.detectUnicodeSupport = t, e.reg = i, e.regg = a, e.ABOUT_LEGACY_COMPAT = O, e.ABOUT_LEGACY_COMPAT_SystemLiteral = L, e.AttlistDecl = M, e.CDATA_START = "<![CDATA[", e.CDATA_END = "]]>", e.CDSect = ee, e.Char = s, e.Comment = $, e.COMMENT_START = R, e.COMMENT_END = "-->", e.DOCTYPE_DECL_START = "<!DOCTYPE", e.elementdecl = F, e.EntityDecl = V, e.EntityValue = y, e.ExternalID = z, e.ExternalID_match = H, e.Name = m, e.Name_exact = g, e.NCName_exact = S, e.NotationDecl = X, e.Reference = b, e.PEReference = v, e.PI = I, e.PUBLIC = U, e.PubidLiteral = C, e.PubidLiteral_match = j, e.QName = N, e.QName_exact = k, e.QName_group = _, e.S = d, e.SChar_s = u, e.S_OPT = p, e.SYSTEM = B, e.SystemLiteral = T, e.SystemLiteral_match = q, e.InvalidChar = l, e.UNICODE_REPLACEMENT_CHARACTER = "�", e.UNICODE_SUPPORT = r, e.XMLDecl = J;
	}), p = a((e) => {
		var t = c(), r = t.find, n = t.hasDefaultHTMLNamespace, o = t.hasOwn, i = t.isHTMLMimeType, a = t.isHTMLRawTextElement, s = t.isHTMLVoidElement, l = t.MIME_TYPE, p = t.NAMESPACE, f = Symbol(), h = u(), m = h.DOMException, g = h.DOMExceptionName, w = d();
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
		function E(e) {
			if (!w.QName_exact.test(e)) throw new m(m.INVALID_CHARACTER_ERR, "invalid character in qualified name \"" + e + "\"");
		}
		function S(e, r) {
			E(r), e = e || null;
			var n = null, o = r;
			if (r.indexOf(":") >= 0) {
				var i = r.split(":");
				n = i[0], o = i[1];
			}
			if (null !== n && null === e) throw new m(m.NAMESPACE_ERR, "prefix is non-null and namespace is null");
			if ("xml" === n && e !== t.NAMESPACE.XML) throw new m(m.NAMESPACE_ERR, "prefix is \"xml\" and namespace is not the XML namespace");
			if (("xmlns" === n || "xmlns" === r) && e !== t.NAMESPACE.XMLNS) throw new m(m.NAMESPACE_ERR, "either qualifiedName or prefix is \"xmlns\" and namespace is not the XMLNS namespace");
			if (e === t.NAMESPACE.XMLNS && "xmlns" !== n && "xmlns" !== r) throw new m(m.NAMESPACE_ERR, "namespace is the XMLNS namespace and neither qualifiedName nor prefix is \"xmlns\"");
			return [
				e,
				n,
				o
			];
		}
		function N(e, t) {
			for (var r in e) o(e, r) && (t[r] = e[r]);
		}
		function k(e, t) {
			var r = e.prototype;
			if (!(r instanceof t)) {
				function n() {}
				n.prototype = t.prototype, N(r, n = new n()), e.prototype = r = n;
			}
			r.constructor != e && ("function" != typeof e && console.error("unknown Class:" + e), r.constructor = e);
		}
		var _ = {}, T = _.ELEMENT_NODE = 1, I = _.ATTRIBUTE_NODE = 2, A = _.TEXT_NODE = 3, C = _.CDATA_SECTION_NODE = 4, R = _.ENTITY_REFERENCE_NODE = 5, $ = _.ENTITY_NODE = 6, D = _.PROCESSING_INSTRUCTION_NODE = 7, P = _.COMMENT_NODE = 8, F = _.DOCUMENT_NODE = 9, M = _.DOCUMENT_TYPE_NODE = 10, O = _.DOCUMENT_FRAGMENT_NODE = 11, L = _.NOTATION_NODE = 12, B = t.freeze({
			DOCUMENT_POSITION_DISCONNECTED: 1,
			DOCUMENT_POSITION_PRECEDING: 2,
			DOCUMENT_POSITION_FOLLOWING: 4,
			DOCUMENT_POSITION_CONTAINS: 8,
			DOCUMENT_POSITION_CONTAINED_BY: 16,
			DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
		});
		function U(e, t) {
			if (t.length < e.length) return U(t, e);
			var r = null;
			for (var n in e) {
				if (e[n] !== t[n]) return r;
				r = e[n];
			}
			return r;
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
				var r = e._refresh(e._node);
				if ($e(e, "length", r.length), !e.$$length || r.length < e.$$length) for (var n = r.length; n in e; n++) o(e, n) && delete e[n];
				N(r, e), e._inc = t;
			}
		}
		function W() {
			this._nsIndex = Object.create(null), this._noNsIndex = Object.create(null);
		}
		function G(e, t) {
			for (var r = 0; r < e.length;) {
				if (e[r] === t) return r;
				r++;
			}
		}
		function V(e, t, r) {
			if (!t) return e._noNsIndex;
			var n = e._nsIndex[t];
			return !n && r && (n = e._nsIndex[t] = Object.create(null)), n;
		}
		function X(e, t, r, n) {
			if (n ? t[G(t, n)] = r : (t[t.length] = r, t.length++), function(e, t) {
				V(e, t.namespaceURI, !0)[t.localName] = t;
			}(t, r), e) {
				r.ownerElement = e;
				var o = e.ownerDocument;
				o && (n && re(o, e, n), function(e, t, r) {
					e && e._inc++, r.namespaceURI === p.XMLNS && (t._nsMap[r.prefix ? r.localName : ""] = r.value);
				}(o, e, r));
			}
		}
		function Z(e, t, r) {
			var n = G(t, r);
			if (n >= 0) {
				for (var o = t.length - 1; n <= o;) t[n] = t[++n];
				if (t.length = o, function(e, t) {
					var r = V(e, t.namespaceURI, !1);
					r && delete r[t.localName];
				}(t, r), e) {
					var i = e.ownerDocument;
					i && re(i, e, r), r.ownerElement = null;
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
		function ee(e, t, r) {
			for (var n = [{
				node: e,
				context: t,
				phase: ee.ENTER
			}]; n.length > 0;) {
				var o = n.pop();
				if (o.phase === ee.ENTER) {
					var i = r.enter(o.node, o.context);
					if (i === ee.STOP) return ee.STOP;
					if (n.push({
						node: o.node,
						context: i,
						phase: ee.EXIT
					}), null == i) continue;
					for (var a = o.node.lastChild; a;) n.push({
						node: a,
						context: i,
						phase: ee.ENTER
					}), a = a.previousSibling;
				} else r.exit && r.exit(o.node, o.context);
			}
		}
		function te(e, t) {
			b(e);
			var r = t || {};
			this.ownerDocument = this, this.contentType = r.contentType || l.XML_APPLICATION, this.type = i(this.contentType) ? "html" : "xml";
		}
		function re(e, t, r, n) {
			e && e._inc++, r.namespaceURI === p.XMLNS && delete t._nsMap[r.prefix ? r.localName : ""];
		}
		function ne(e, t, r) {
			if (e && e._inc) {
				e._inc++;
				var n = t.childNodes;
				if (r && !r.nextSibling) n[n.length++] = r;
				else {
					for (var o = t.firstChild, i = 0; o;) n[i++] = o, o = o.nextSibling;
					n.length = i, delete n[n.length];
				}
			}
		}
		function oe(e, t) {
			if (e !== t.parentNode) throw new m(m.NOT_FOUND_ERR, "child's parent is not parent");
			var r = t.previousSibling, n = t.nextSibling;
			return r ? r.nextSibling = n : e.firstChild = n, n ? n.previousSibling = r : e.lastChild = r, ne(e.ownerDocument, e), t.parentNode = null, t.previousSibling = null, t.nextSibling = null, t;
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
			var n = e.childNodes || [];
			if (r(n, ae) || ie(t)) return !1;
			var o = r(n, ie);
			return !(t && o && n.indexOf(o) > n.indexOf(t));
		}
		function ce(e, t) {
			var n = e.childNodes || [];
			if (r(n, function(e) {
				return ae(e) && e !== t;
			})) return !1;
			var o = r(n, ie);
			return !(t && o && n.indexOf(o) > n.indexOf(t));
		}
		function ue(e, t, r) {
			if (!function(e) {
				return e && (e.nodeType === Q.DOCUMENT_NODE || e.nodeType === Q.DOCUMENT_FRAGMENT_NODE || e.nodeType === Q.ELEMENT_NODE);
			}(e)) throw new m(m.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + e.nodeType);
			if (r && r.parentNode !== e) throw new m(m.NOT_FOUND_ERR, "child not in parent");
			if (!function(e) {
				return e && (e.nodeType === Q.CDATA_SECTION_NODE || e.nodeType === Q.COMMENT_NODE || e.nodeType === Q.DOCUMENT_FRAGMENT_NODE || e.nodeType === Q.DOCUMENT_TYPE_NODE || e.nodeType === Q.ELEMENT_NODE || e.nodeType === Q.PROCESSING_INSTRUCTION_NODE || e.nodeType === Q.TEXT_NODE);
			}(t) || ie(t) && e.nodeType !== Q.DOCUMENT_NODE) throw new m(m.HIERARCHY_REQUEST_ERR, "Unexpected node type " + t.nodeType + " for parent node type " + e.nodeType);
		}
		function de(e, t, n) {
			var o = e.childNodes || [], i = t.childNodes || [];
			if (t.nodeType === Q.DOCUMENT_FRAGMENT_NODE) {
				var a = i.filter(ae);
				if (a.length > 1 || r(i, se)) throw new m(m.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
				if (1 === a.length && !le(e, n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
			}
			if (ae(t) && !le(e, n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
			if (ie(t)) {
				if (r(o, ie)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
				var s = r(o, ae);
				if (n && o.indexOf(s) < o.indexOf(n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
				if (!n && s) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
			}
		}
		function pe(e, t, n) {
			var o = e.childNodes || [], i = t.childNodes || [];
			if (t.nodeType === Q.DOCUMENT_FRAGMENT_NODE) {
				var a = i.filter(ae);
				if (a.length > 1 || r(i, se)) throw new m(m.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
				if (1 === a.length && !ce(e, n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
			}
			if (ae(t) && !ce(e, n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
			if (ie(t)) {
				if (r(o, function(e) {
					return ie(e) && e !== n;
				})) throw new m(m.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
				var s = r(o, ae);
				if (n && o.indexOf(s) < o.indexOf(n)) throw new m(m.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
			}
		}
		function fe(e, t, r, n) {
			ue(e, t, r), e.nodeType === Q.DOCUMENT_NODE && (n || de)(e, t, r);
			var o = t.parentNode;
			if (o && o.removeChild(t), t.nodeType === O) {
				var i = t.firstChild;
				if (null == i) return t;
				var a = t.lastChild;
			} else i = a = t;
			var s = r ? r.previousSibling : e.lastChild;
			i.previousSibling = s, a.nextSibling = r, s ? s.nextSibling = i : e.firstChild = i, null == r ? e.lastChild = a : r.previousSibling = a;
			do
				i.parentNode = e;
			while (i !== a && (i = i.nextSibling));
			return ne(e.ownerDocument || e, e, t), t.nodeType == O && (t.firstChild = t.lastChild = null), t;
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
		function Ee(e) {
			b(e);
		}
		function Se(e) {
			b(e);
		}
		function Ne(e) {
			b(e);
		}
		function ke(e) {
			b(e);
		}
		function _e() {}
		function Te(e) {
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
			var r = [], n = this.nodeType === F && this.documentElement || this, o = n.prefix, i = n.namespaceURI;
			if (i && null == o && null == (o = n.lookupPrefix(i))) var a = [{
				namespace: i,
				prefix: null
			}];
			return Ce(this, r, a, t), r.join("");
		}
		function Ie(e, t, r) {
			var n = e.prefix || "", o = e.namespaceURI;
			if (!o) return !1;
			if ("xml" === n && o === p.XML || o === p.XMLNS) return !1;
			for (var i = r.length; i--;) {
				var a = r[i];
				if (a.prefix === n) return a.namespace !== o;
			}
			return !0;
		}
		function Ae(e, t, r, n) {
			if (n && !w.QName_exact.test(t)) throw new m("The attribute name \"" + t + "\" is not a valid XML QName", g.InvalidStateError);
			e.push(" ", t, "=\"", r.replace(/[<>&"\t\n\r]/g, K), "\"");
		}
		function Ce(e, t, r, n) {
			r || (r = []);
			var o = n.nodeFilter, i = n.requireWellFormed, l = n.splitCDATASections, c = "html" === (e.nodeType === F ? e : e.ownerDocument).type;
			ee(e, { ns: r }, {
				enter: function(e, r) {
					var u = r.ns;
					if (o) {
						if (!(e = o(e))) return null;
						if ("string" == typeof e) return t.push(e), null;
					}
					switch (e.nodeType) {
						case T:
							var d = e.attributes, f = d.length, h = e.tagName, b = h;
							if (!c && !e.prefix && e.namespaceURI) {
								for (var v, y = 0; y < d.length; y++) if ("xmlns" === d.item(y).name) {
									v = d.item(y).value;
									break;
								}
								if (!v) {
									for (var x = u.length - 1; x >= 0; x--) if ("" === (E = u[x]).prefix && E.namespace === e.namespaceURI) {
										v = E.namespace;
										break;
									}
								}
								if (v !== e.namespaceURI) for (x = u.length - 1; x >= 0; x--) {
									var E;
									if ((E = u[x]).namespace === e.namespaceURI) {
										E.prefix && (b = E.prefix + ":" + h);
										break;
									}
								}
							}
							if (i && !w.QName_exact.test(b)) throw new m("The element name \"" + b + "\" is not a valid XML QName", g.InvalidStateError);
							t.push("<", b);
							for (var S = u.slice(), N = 0; N < f; N++) "xmlns" == (k = d.item(N)).prefix ? S.push({
								prefix: k.localName,
								namespace: k.value
							}) : "xmlns" == k.nodeName && S.push({
								prefix: "",
								namespace: k.value
							});
							for (N = 0; N < f; N++) {
								var k;
								if (Ie(k = d.item(N), 0, S)) {
									var _ = k.prefix || "", $ = k.namespaceURI;
									Ae(t, _ ? "xmlns:" + _ : "xmlns", $, i), S.push({
										prefix: _,
										namespace: $
									});
								}
								var L = o ? o(k) : k;
								L && ("string" == typeof L ? t.push(L) : Ae(t, L.name, L.value, i));
							}
							if (h === b && Ie(e, 0, S)) {
								var B = e.prefix || "";
								$ = e.namespaceURI;
								Ae(t, B ? "xmlns:" + B : "xmlns", $, i), S.push({
									prefix: B,
									namespace: $
								});
							}
							var U = !e.firstChild;
							if (U && (c || e.namespaceURI === p.HTML) && (U = s(h)), U) return t.push("/>"), null;
							if (t.push(">"), c && a(h)) {
								for (var z = e.firstChild; z;) z.data ? t.push(z.data) : Ce(z, t, S.slice(), n), z = z.nextSibling;
								return t.push("</", b, ">"), null;
							}
							return {
								ns: S,
								tag: b
							};
						case F:
						case O:
							if (i && e.nodeType === F && null == e.documentElement) throw new m("The Document has no documentElement", g.InvalidStateError);
							return { ns: u };
						case I: return Ae(t, e.name, e.value, i), null;
						case A:
							if (i && w.InvalidChar.test(e.data)) throw new m("The Text node data contains characters outside the XML Char production", g.InvalidStateError);
							return t.push(e.data.replace(/[<&>]/g, K)), null;
						case C:
							if (i && -1 !== e.data.indexOf("]]>")) throw new m("The CDATASection data contains \"]]>\"", g.InvalidStateError);
							return l ? t.push(w.CDATA_START, e.data.replace(/]]>/g, "]]]]><![CDATA[>"), w.CDATA_END) : t.push(w.CDATA_START, e.data, w.CDATA_END), null;
						case P:
							if (i) {
								if (w.InvalidChar.test(e.data)) throw new m("The comment node data contains characters outside the XML Char production", g.InvalidStateError);
								if (-1 !== e.data.indexOf("--") || "-" === e.data[e.data.length - 1]) throw new m("The comment node data contains \"--\" or ends with \"-\"", g.InvalidStateError);
							}
							return t.push(w.COMMENT_START, e.data, w.COMMENT_END), null;
						case M:
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
				exit: function(e, r) {
					r && r.tag && t.push("</", r.tag, ">");
				}
			});
		}
		function Re(e, t, r) {
			var n;
			return ee(t, null, { enter: function(t, i) {
				var a = new t.constructor(f);
				for (var s in t) if (o(t, s)) {
					var l = t[s];
					"object" != typeof l && l != a[s] && (a[s] = l);
				}
				t.childNodes && (a.childNodes = new H()), a.ownerDocument = e;
				var c = r;
				switch (a.nodeType) {
					case T:
						var u = t.attributes, d = a.attributes = new W(), p = u.length;
						d._ownerElement = a;
						for (var h = 0; h < p; h++) a.setAttributeNode(Re(e, u.item(h), !0));
						break;
					case I: c = !0;
				}
				return null !== i ? i.appendChild(a) : n = a, c ? a : null;
			} }), n;
		}
		function $e(e, t, r) {
			e[t] = r;
		}
		function De(e) {
			for (var t = [], r = e.firstChild; r;) r.nodeType === T && t.push(r), r = r.nextSibling;
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
				for (var r = [], n = 0; n < this.length; n++) Ce(this[n], r, null, t);
				return r.join("");
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
					var r = this[t];
					if (r.nodeName === e) return r;
					t++;
				}
				return null;
			},
			setNamedItem: function(e) {
				var t = e.ownerElement;
				if (t && t !== this._ownerElement) throw new m(m.INUSE_ATTRIBUTE_ERR);
				var r, n, o, i, a = (r = this, n = e.namespaceURI, o = e.localName, (i = V(r, n, !1)) && i[o] || null);
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
				var r = this.getNamedItemNS(e, t);
				if (!r) throw new m(m.NOT_FOUND_ERR, e ? e + " : " + t : t);
				return Z(this._ownerElement, this, r), r;
			},
			getNamedItemNS: function(e, t) {
				e || (e = null);
				for (var r = 0; r < this.length;) {
					var n = this[r];
					if (n.localName === t && n.namespaceURI === e) return n;
					r++;
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
			createDocument: function(e, t, r) {
				var n = l.XML_APPLICATION;
				e === p.HTML ? n = l.XML_XHTML_APPLICATION : e === p.SVG && (n = l.XML_SVG_IMAGE);
				var o = new te(f, { contentType: n });
				if (o.implementation = this, o.childNodes = new H(), o.doctype = r || null, r && o.appendChild(r), t) {
					var i = o.createElementNS(e, t);
					o.appendChild(i);
				}
				return o;
			},
			createDocumentType: function(e, t, r, n) {
				E(e);
				var o = new ye(f);
				return o.name = e, o.nodeName = e, o.publicId = t || "", o.systemId = r || "", o.internalSubset = n || "", o.childNodes = new H(), o;
			},
			createHTMLDocument: function(e) {
				var t = new te(f, { contentType: l.HTML });
				if (t.implementation = this, t.childNodes = new H(), !1 !== e) {
					t.doctype = this.createDocumentType("html"), t.doctype.ownerDocument = t, t.appendChild(t.doctype);
					var r = t.createElement("html");
					t.appendChild(r);
					var n = t.createElement("head");
					if (r.appendChild(n), "string" == typeof e) {
						var o = t.createElement("title");
						o.appendChild(t.createTextNode(e)), n.appendChild(o);
					}
					r.appendChild(t.createElement("body"));
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
					var r = t.pop(), n = r.node, o = r.other;
					if (n.nodeType !== o.nodeType) return !1;
					switch (n.nodeType) {
						case n.DOCUMENT_TYPE_NODE:
							if (n.name !== o.name) return !1;
							if (n.publicId !== o.publicId) return !1;
							if (n.systemId !== o.systemId) return !1;
							break;
						case n.ELEMENT_NODE:
							if (n.namespaceURI !== o.namespaceURI) return !1;
							if (n.prefix !== o.prefix) return !1;
							if (n.localName !== o.localName) return !1;
							if (n.attributes.length !== o.attributes.length) return !1;
							for (var i = 0; i < n.attributes.length; i++) {
								var a = n.attributes.item(i), s = o.getAttributeNodeNS(a.namespaceURI, a.localName);
								if (!s) return !1;
								t.push({
									node: a,
									other: s
								});
							}
							break;
						case n.ATTRIBUTE_NODE:
							if (n.namespaceURI !== o.namespaceURI) return !1;
							if (n.localName !== o.localName) return !1;
							if (n.value !== o.value) return !1;
							break;
						case n.PROCESSING_INSTRUCTION_NODE:
							if (n.target !== o.target || n.data !== o.data) return !1;
							break;
						case n.TEXT_NODE:
						case n.CDATA_SECTION_NODE:
						case n.COMMENT_NODE: if (n.data !== o.data) return !1;
					}
					if (n.childNodes.length !== o.childNodes.length) return !1;
					for (i = n.childNodes.length - 1; i >= 0; i--) t.push({
						node: n.childNodes[i],
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
						var r = t.nextSibling;
						if (null !== r && r.nodeType === A && t.nodeType === A) {
							for (var n = [], o = r; null !== o && o.nodeType === A;) n.push(o.data), o = o.nextSibling;
							for (var i = t.nextSibling; i !== o;) {
								var a = i.nextSibling;
								i.parentNode = null, i.previousSibling = null, i.nextSibling = null, i = a;
							}
							t.nextSibling = o, null !== o ? o.previousSibling = t : e.lastChild = t, t.appendData(n.join("")), ne(e.ownerDocument, e), t = o;
						} else t = r;
					}
					return !0;
				} });
			},
			isSupported: function(e, t) {
				return this.ownerDocument.implementation.hasFeature(e, t);
			},
			lookupPrefix: function(e) {
				for (var t = this; t;) {
					var r = t._nsMap;
					if (r) {
						for (var n in r) if (o(r, n) && r[n] === e) return n;
					}
					t = t.nodeType == I ? t.ownerDocument : t.parentNode;
				}
				return null;
			},
			lookupNamespaceURI: function(e) {
				for (var t = this; t;) {
					var r = t._nsMap;
					if (r && o(r, e)) return r[e];
					t = t.nodeType == I ? t.ownerDocument : t.parentNode;
				}
				return null;
			},
			isDefaultNamespace: function(e) {
				return null == this.lookupPrefix(e);
			},
			compareDocumentPosition: function(e) {
				if (this === e) return 0;
				var t = e, r = this, n = null, o = null;
				if (t instanceof me && (t = (n = t).ownerElement), r instanceof me && (r = (o = r).ownerElement, n && t && r === t)) for (var i, a = 0; i = r.attributes[a]; a++) {
					if (i === n) return B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + B.DOCUMENT_POSITION_PRECEDING;
					if (i === o) return B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + B.DOCUMENT_POSITION_FOLLOWING;
				}
				if (!t || !r || r.ownerDocument !== t.ownerDocument) return B.DOCUMENT_POSITION_DISCONNECTED + B.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (z(r.ownerDocument) > z(t.ownerDocument) ? B.DOCUMENT_POSITION_FOLLOWING : B.DOCUMENT_POSITION_PRECEDING);
				if (o && t === r) return B.DOCUMENT_POSITION_CONTAINS + B.DOCUMENT_POSITION_PRECEDING;
				if (n && t === r) return B.DOCUMENT_POSITION_CONTAINED_BY + B.DOCUMENT_POSITION_FOLLOWING;
				for (var s = [], l = t.parentNode; l;) {
					if (!o && l === r) return B.DOCUMENT_POSITION_CONTAINED_BY + B.DOCUMENT_POSITION_FOLLOWING;
					s.push(l), l = l.parentNode;
				}
				s.reverse();
				for (var c = [], u = r.parentNode; u;) {
					if (!n && u === t) return B.DOCUMENT_POSITION_CONTAINS + B.DOCUMENT_POSITION_PRECEDING;
					c.push(u), u = u.parentNode;
				}
				c.reverse();
				var d = U(s, c);
				for (var p in d.childNodes) {
					var f = d.childNodes[p];
					if (f === r) return B.DOCUMENT_POSITION_FOLLOWING;
					if (f === t) return B.DOCUMENT_POSITION_PRECEDING;
					if (c.indexOf(f) >= 0) return B.DOCUMENT_POSITION_FOLLOWING;
					if (s.indexOf(f) >= 0) return B.DOCUMENT_POSITION_PRECEDING;
				}
				return 0;
			}
		}, N(_, Q), N(_, Q.prototype), N(B, Q), N(B, Q.prototype), ee.STOP = Symbol("walkDOM.STOP"), ee.ENTER = 0, ee.EXIT = 1, te.prototype = {
			implementation: null,
			nodeName: "#document",
			nodeType: F,
			doctype: null,
			documentElement: null,
			_inc: 1,
			insertBefore: function(e, t) {
				if (e.nodeType === O) {
					for (var r = e.firstChild; r;) {
						var n = r.nextSibling;
						this.insertBefore(r, t), r = n;
					}
					return e;
				}
				return fe(this, e, t), e.ownerDocument = this, null === this.documentElement && e.nodeType === T && (this.documentElement = e), e;
			},
			removeChild: function(e) {
				var t = oe(this, e);
				return t === this.documentElement && (this.documentElement = null), t;
			},
			replaceChild: function(e, t) {
				fe(this, e, t, pe), e.ownerDocument = this, t && this.removeChild(t), ae(e) && (this.documentElement = e);
			},
			importNode: function(e, t) {
				return function(e, t, r) {
					var n;
					return ee(t, null, { enter: function(t, o) {
						var i = t.cloneNode(!1);
						return i.ownerDocument = e, i.parentNode = null, null === o ? n = i : o.appendChild(i), t.nodeType === I || r ? i : null;
					} }), n;
				}(this, e, t);
			},
			getElementById: function(e) {
				var t = null;
				return J(this.documentElement, function(r) {
					if (r.nodeType == T && r.getAttribute("id") == e) return t = r, !0;
				}), t;
			},
			createElement: function(e) {
				var t = new he(f);
				return t.ownerDocument = this, "html" === this.type && (e = e.toLowerCase()), n(this.contentType) && (t.namespaceURI = p.HTML), t.nodeName = e, t.tagName = e, t.localName = e, t.childNodes = new H(), (t.attributes = new W())._ownerElement = t, t;
			},
			createDocumentFragment: function() {
				var e = new Ne(f);
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
				var r = new ke(f);
				return r.ownerDocument = this, r.childNodes = new H(), r.nodeName = r.target = e, r.nodeValue = r.data = t, r;
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
				var t = new Se(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.nodeName = e, t;
			},
			createElementNS: function(e, t) {
				var r = S(e, t), n = new he(f), o = n.attributes = new W();
				return n.childNodes = new H(), n.ownerDocument = this, n.nodeName = t, n.tagName = t, n.namespaceURI = r[0], n.prefix = r[1], n.localName = r[2], o._ownerElement = n, n;
			},
			createAttributeNS: function(e, t) {
				var r = S(e, t), n = new me(f);
				return n.ownerDocument = this, n.childNodes = new H(), n.nodeName = t, n.name = t, n.specified = !0, n.namespaceURI = r[0], n.prefix = r[1], n.localName = r[2], n;
			}
		}, k(te, Q), he.prototype = {
			nodeType: T,
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
				var r = this.getAttributeNode(e);
				r ? r.value = r.nodeValue = "" + t : ((r = this.ownerDocument._createAttribute(e)).value = r.nodeValue = "" + t, this.setAttributeNode(r));
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
				var r = this.getAttributeNodeNS(e, t);
				r && this.removeAttributeNode(r);
			},
			hasAttributeNS: function(e, t) {
				return null != this.getAttributeNodeNS(e, t);
			},
			getAttributeNS: function(e, t) {
				var r = this.getAttributeNodeNS(e, t);
				return r ? r.value : null;
			},
			setAttributeNS: function(e, t, r) {
				var n = S(e, t)[2], o = this.getAttributeNodeNS(e, n);
				o ? o.value = o.nodeValue = "" + r : ((o = this.ownerDocument.createAttributeNS(e, t)).value = o.nodeValue = "" + r, this.setAttributeNode(o));
			},
			getAttributeNodeNS: function(e, t) {
				return this.attributes.getNamedItemNS(e, t);
			},
			getElementsByClassName: function(e) {
				var t = x(e);
				return new j(this, function(r) {
					var n = [];
					return t.length > 0 && J(r, function(o) {
						if (o !== r && o.nodeType === T) {
							var i = o.getAttribute("class");
							if (i) {
								var a = e === i;
								if (!a) {
									var s = x(i);
									a = t.every((l = s, function(e) {
										return l && -1 !== l.indexOf(e);
									}));
								}
								a && n.push(o);
							}
						}
						var l;
					}), n;
				});
			},
			getElementsByTagName: function(e) {
				var t = "html" === (this.nodeType === F ? this : this.ownerDocument).type, r = e.toLowerCase();
				return new j(this, function(n) {
					var o = [];
					return J(n, function(i) {
						i !== n && i.nodeType === T && ("*" === e || i.getQualifiedName() === (t && i.namespaceURI === p.HTML ? r : e)) && o.push(i);
					}), o;
				});
			},
			getElementsByTagNameNS: function(e, t) {
				return new j(this, function(r) {
					var n = [];
					return J(r, function(o) {
						o === r || o.nodeType !== T || "*" !== e && o.namespaceURI !== e || "*" !== t && o.localName != t || n.push(o);
					}), n;
				});
			}
		}, te.prototype.getElementsByClassName = he.prototype.getElementsByClassName, te.prototype.getElementsByTagName = he.prototype.getElementsByTagName, te.prototype.getElementsByTagNameNS = he.prototype.getElementsByTagNameNS, k(he, Q), me.prototype.nodeType = I, k(me, Q), ge.prototype = {
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
			replaceData: function(e, t, r) {
				r = this.data.substring(0, e) + r + this.data.substring(e + t), this.nodeValue = this.data = r, this.length = r.length;
			}
		}, k(ge, Q), we.prototype = {
			nodeName: "#text",
			nodeType: A,
			splitText: function(e) {
				var t = this.data, r = t.substring(e);
				t = t.substring(0, e), this.data = this.nodeValue = t, this.length = t.length;
				var n = this.ownerDocument.createTextNode(r);
				return this.parentNode && this.parentNode.insertBefore(n, this.nextSibling), n;
			}
		}, k(we, ge), be.prototype = {
			nodeName: "#comment",
			nodeType: P
		}, k(be, ge), ve.prototype = {
			nodeName: "#cdata-section",
			nodeType: C
		}, k(ve, we), ye.prototype.nodeType = M, k(ye, Q), xe.prototype.nodeType = L, k(xe, Q), Ee.prototype.nodeType = $, k(Ee, Q), Se.prototype.nodeType = R, k(Se, Q), Ne.prototype.nodeName = "#document-fragment", Ne.prototype.nodeType = O, k(Ne, Q), ke.prototype.nodeType = D, k(ke, ge), _e.prototype.serializeToString = function(e, t) {
			return Te.call(e, t);
		}, Q.prototype.toString = Te;
		try {
			Object.defineProperty && (Object.defineProperty(j.prototype, "length", { get: function() {
				return q(this), this.$$length;
			} }), Object.defineProperty(Q.prototype, "textContent", {
				get: function() {
					if (this.nodeType === T || this.nodeType === O) {
						var e = [];
						return ee(this, null, { enter: function(t) {
							return t.nodeType === T || t.nodeType === O || (t.nodeType === D || t.nodeType === P ? null : void e.push(t.nodeValue));
						} }), e.join("");
					}
					return this.nodeValue;
				},
				set: function(e) {
					switch (this.nodeType) {
						case T:
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
			} }), Object.defineProperty(Ne.prototype, "children", { get: function() {
				return new j(this, De);
			} }), $e = function(e, t, r) {
				e["$$" + t] = r;
			});
		} catch (Pe) {}
		e._updateLiveList = q, e.Attr = me, e.CDATASection = ve, e.CharacterData = ge, e.Comment = be, e.Document = te, e.DocumentFragment = Ne, e.DocumentType = ye, e.DOMImplementation = Y, e.Element = he, e.Entity = Ee, e.EntityReference = Se, e.LiveNodeList = j, e.NamedNodeMap = W, e.Node = Q, e.NodeList = H, e.Notation = xe, e.Text = we, e.ProcessingInstruction = ke, e.walkDOM = ee, e.XMLSerializer = _e;
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
		var t = c(), r = d(), n = u(), o = t.isHTMLEscapableRawTextElement, i = t.isHTMLMimeType, a = t.isHTMLRawTextElement, s = t.hasOwn, l = t.NAMESPACE, p = n.ParseError, f = n.DOMException;
		function h() {}
		h.prototype = { parse: function(e, n, o) {
			var a = this.domBuilder;
			a.startDocument(), function(e, t) {
				for (var r in e) s(e, r) && (t[r] = e[r]);
			}(n, n = Object.create(null)), function(e, n, o, a, l) {
				var c = i(a.mimeType);
				e.indexOf(r.UNICODE_REPLACEMENT_CHARACTER) >= 0 && l.warning("Unicode replacement character detected, source encoding issues?");
				function u(e) {
					if (e > 65535) {
						var t = 55296 + ((e -= 65536) >> 10), r = 56320 + (1023 & e);
						return String.fromCharCode(t, r);
					}
					return String.fromCharCode(e);
				}
				function d(e) {
					var t = ";" === e[e.length - 1] ? e : e + ";";
					if (!c && t !== e) return l.error("EntityRef: expecting ;"), e;
					var n = r.Reference.exec(t);
					if (!n || n[0].length !== t.length) return l.error("entity not matching Reference production: " + e), e;
					var i = t.slice(1, -1);
					return s(o, i) ? o[i] : "#" === i.charAt(0) ? u(parseInt(i.substring(1).replace("x", "0x"))) : (l.error("entity not found:" + e), e);
				}
				function h(t) {
					if (t > C) {
						var r = e.substring(C, t).replace(m, d);
						_ && T(C), a.characters(r, 0, t - C), C = t;
					}
				}
				var y = 0, N = 0, k = /\r\n?|\n|$/g, _ = a.locator;
				function T(t, r) {
					for (; t >= N && (r = k.exec(e));) y = N, N = r.index + r[0].length, _.lineNumber++;
					_.columnNumber = t - y + 1;
				}
				var I = [{ currentNSMap: n }], A = [], C = 0;
				for (;;) {
					try {
						var R = e.indexOf("<", C);
						if (R < 0) {
							if (!c && A.length > 0) return l.fatalError("unclosed xml tag(s): " + A.join(", "));
							if (!e.substring(C).match(/^\s*$/)) {
								var $ = a.doc, D = $.createTextNode(e.substring(C));
								if ($.documentElement) return l.error("Extra content at the end of the document");
								$.appendChild(D), a.currentElement = D;
							}
							return;
						}
						if (R > C) {
							var P = e.substring(C, R);
							c || 0 !== A.length || (P = P.replace(new RegExp(r.S_OPT.source, "g"), "")) && l.error("Unexpected content outside root element: '" + P + "'"), h(R);
						}
						switch (e.charAt(R + 1)) {
							case "/":
								var F = e.indexOf(">", R + 2), M = e.substring(R + 2, F > 0 ? F : void 0);
								if (!M) return l.fatalError("end tag name missing");
								var O = r.reg("^", r.QName_group, r.S_OPT, "$"), L = F > 0 && O.exec(M);
								if (!L) {
									var B = F > 0 && r.reg("^", r.QName_group).exec(M);
									if (c && B) l.warning("end tag name contains invalid trailing characters: \"" + M + "\""), L = B;
									else {
										if (!B || !new RegExp(O.source, O.flags + "m").test(M)) return l.fatalError("end tag name contains invalid characters: \"" + M + "\"");
										l.error("end tag name is followed by a line break and trailing content: \"" + M + "\""), L = B;
									}
								}
								if (!a.currentElement && !a.doc.documentElement) return;
								var U = A[A.length - 1] || a.currentElement.tagName || a.doc.documentElement.tagName || "";
								if (U !== L[1]) {
									var z = L[1].toLowerCase();
									if (!c || U.toLowerCase() !== z) return l.fatalError("Opening and ending tag mismatch: \"" + U + "\" != \"" + M + "\"");
								}
								var H = I.pop();
								A.pop();
								var j = H.localNSMap;
								if (a.endElement(H.uri, H.localName, U), j) for (var q in j) s(j, q) && a.endPrefixMapping(q);
								F++;
								break;
							case "?":
								_ && T(R), F = E(e, R, a, l);
								break;
							case "!":
								_ && T(R), F = x(e, R, a, l, c);
								break;
							default:
								_ && T(R);
								var W = new S(), G = I[I.length - 1].currentNSMap, V = (F = w(e, R, W, G, d, l, c), W.length);
								if (W.closed || (c && t.isHTMLVoidElement(W.tagName) ? W.closed = !0 : A.push(W.tagName)), _ && V) {
									for (var X = g(_, {}), Z = 0; Z < V; Z++) {
										var Y = W[Z];
										T(Y.offset), Y.locator = g(_, {});
									}
									a.locator = X, b(W, a, G) && I.push(W), a.locator = _;
								} else b(W, a, G) && I.push(W);
								c && !W.closed ? F = v(e, F, W.tagName, d, a) : F++;
						}
					} catch (Q) {
						if (Q instanceof p) throw Q;
						if (Q instanceof f) return l.fatalError("Error constructing the DOM: " + Q.name + ": " + Q.message, Q);
						l.error("element parse error: " + Q), F = -1;
					}
					F > C ? C = F : h(Math.max(R, C) + 1);
				}
			}(e, n, o, a, this.errorHandler), a.endDocument();
		} };
		var m = /&#?\w+;?/g;
		function g(e, t) {
			return t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber, t;
		}
		function w(e, t, r, n, o, i, a) {
			function l(e, t, n) {
				return s(r.attributeNames, e) ? i.fatalError("Attribute " + e + " redefined") : !a && t.indexOf("<") >= 0 ? i.fatalError("Unescaped '<' not allowed in attributes values") : void r.addValue(e, t.replace(/[\t\n\r]/g, " ").replace(m, o), n);
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
							case 0: r.setTagName(e.slice(t, u));
							case 5:
							case 6:
							case 7: d = 7, r.closed = !0;
							case 4:
							case 1: break;
							case 2:
								r.closed = !0;
								break;
							default: throw new Error("attribute invalid close char('/')");
						}
						break;
					case "": return i.error("unexpected end of input"), 0 == d && r.setTagName(e.slice(t, u)), u;
					case ">":
						switch (d) {
							case 0: r.setTagName(e.slice(t, u));
							case 5:
							case 6:
							case 7: break;
							case 4:
							case 1: "/" === (f = e.slice(t, u)).slice(-1) && (r.closed = !0, f = f.slice(0, -1));
							case 2:
								2 === d && (f = c), 4 == d ? (i.warning("attribute \"" + f + "\" missed quot(\")!"), l(c, f, t)) : (a || i.warning("attribute \"" + f + "\" missed value!! \"" + f + "\" instead!!"), l(f, f, t));
								break;
							case 3: if (!a) return i.fatalError("AttValue: ' or \" expected");
						}
						return u;
					case "": p = " ";
					default: if (p <= " ") switch (d) {
						case 0:
							r.setTagName(e.slice(t, u)), d = 6;
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
		function b(e, t, r) {
			for (var n = e.tagName, o = null, i = e.length; i--;) {
				var a = e[i], c = a.qName, u = a.value;
				if ((h = c.indexOf(":")) > 0) var d = a.prefix = c.slice(0, h), p = c.slice(h + 1), f = "xmlns" === d && p;
				else p = c, d = null, f = "xmlns" === c && "";
				a.localName = p, !1 !== f && (null == o && (o = Object.create(null), r = Object.create(r)), r[f] = o[f] = u, a.uri = l.XMLNS, t.startPrefixMapping(f, u));
			}
			for (i = e.length; i--;) (a = e[i]).prefix && ("xml" === a.prefix && (a.uri = l.XML), "xmlns" !== a.prefix && (a.uri = r[a.prefix]));
			var h;
			(h = n.indexOf(":")) > 0 ? (d = e.prefix = n.slice(0, h), p = e.localName = n.slice(h + 1)) : (d = null, p = e.localName = n);
			var m = e.uri = r[d || ""];
			if (t.startElement(m, p, n, e), !e.closed) return e.currentNSMap = r, e.localNSMap = o, !0;
			if (t.endElement(m, p, n), o) for (d in o) s(o, d) && t.endPrefixMapping(d);
		}
		function v(e, t, r, n, i) {
			var s = o(r);
			if (s || a(r)) {
				var l = new RegExp("</" + r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ">", "ig");
				l.lastIndex = t;
				var c = l.exec(e), u = c ? c.index : -1;
				if (u < 0) return t + 1;
				var d = e.substring(t + 1, u);
				return s && (d = d.replace(m, n)), i.characters(d, 0, d.length), u;
			}
			return t + 1;
		}
		function y(e, t) {
			var n = t;
			function o(t) {
				return t = t || 0, e.charAt(n + t);
			}
			function i(e) {
				n += e = e || 1;
			}
			function a() {
				return e.substring(n);
			}
			return {
				char: o,
				getIndex: function() {
					return n;
				},
				getMatch: function(e) {
					var t = r.reg("^", e).exec(a());
					return t ? (i(t[0].length), t[0]) : null;
				},
				getSource: function() {
					return e;
				},
				skip: i,
				skipBlanks: function() {
					for (var t = 0; n < e.length;) {
						var r = o();
						if (" " !== r && "\n" !== r && "	" !== r && "\r" !== r) return t;
						t++, i();
					}
					return -1;
				},
				substringFromIndex: a,
				substringStartsWith: function(t) {
					return e.substring(n, n + t.length) === t;
				},
				substringStartsWithCaseInsensitive: function(t) {
					return e.substring(n, n + t.length).toUpperCase() === t.toUpperCase();
				}
			};
		}
		function x(e, t, n, o, i) {
			var a = y(e, t);
			switch (i ? a.char(2).toUpperCase() : a.char(2)) {
				case "-":
					var s = a.getMatch(r.Comment);
					return s ? (n.comment(s, r.COMMENT_START.length, s.length - r.COMMENT_START.length - r.COMMENT_END.length), a.getIndex()) : o.fatalError("comment is not well-formed at position " + a.getIndex());
				case "[":
					var l = a.getMatch(r.CDSect);
					return l ? i || n.currentElement ? (n.startCDATA(), n.characters(l, r.CDATA_START.length, l.length - r.CDATA_START.length - r.CDATA_END.length), n.endCDATA(), a.getIndex()) : o.fatalError("CDATA outside of element") : o.fatalError("Invalid CDATA starting at position " + t);
				case "D":
					if (n.doc && n.doc.documentElement) return o.fatalError("Doctype not allowed inside or after documentElement at position " + a.getIndex());
					if (i ? !a.substringStartsWithCaseInsensitive(r.DOCTYPE_DECL_START) : !a.substringStartsWith(r.DOCTYPE_DECL_START)) return o.fatalError("Expected " + r.DOCTYPE_DECL_START + " at position " + a.getIndex());
					if (a.skip(r.DOCTYPE_DECL_START.length), a.skipBlanks() < 1) return o.fatalError("Expected whitespace after " + r.DOCTYPE_DECL_START + " at position " + a.getIndex());
					var c = {
						name: void 0,
						publicId: void 0,
						systemId: void 0,
						internalSubset: void 0
					};
					if (c.name = a.getMatch(r.Name), !c.name) return o.fatalError("doctype name missing or contains unexpected characters at position " + a.getIndex());
					if (i && "html" !== c.name.toLowerCase() && o.warning("Unexpected DOCTYPE in HTML document at position " + a.getIndex()), a.skipBlanks(), a.substringStartsWith(r.PUBLIC) || a.substringStartsWith(r.SYSTEM)) {
						var u = r.ExternalID_match.exec(a.substringFromIndex());
						if (!u) return o.fatalError("doctype external id is not well-formed at position " + a.getIndex());
						void 0 !== u.groups.SystemLiteralOnly ? c.systemId = u.groups.SystemLiteralOnly : (c.systemId = u.groups.SystemLiteral, c.publicId = u.groups.PubidLiteral), a.skip(u[0].length);
					} else if (i && a.substringStartsWithCaseInsensitive(r.SYSTEM)) {
						if (a.skip(r.SYSTEM.length), a.skipBlanks() < 1) return o.fatalError("Expected whitespace after " + r.SYSTEM + " at position " + a.getIndex());
						if (c.systemId = a.getMatch(r.ABOUT_LEGACY_COMPAT_SystemLiteral), !c.systemId) return o.fatalError("Expected " + r.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + r.SYSTEM + " at position " + a.getIndex());
					}
					return i && c.systemId && !r.ABOUT_LEGACY_COMPAT_SystemLiteral.test(c.systemId) && o.warning("Unexpected doctype.systemId in HTML document at position " + a.getIndex()), i || (a.skipBlanks(), c.internalSubset = function(e, t) {
						function n(e, t) {
							var n = r.PI.exec(e.substringFromIndex());
							return n ? "xml" === n[1].toLowerCase() ? t.fatalError("xml declaration is only allowed at the start of the document, but found at position " + e.getIndex()) : (e.skip(n[0].length), n[0]) : t.fatalError("processing instruction is not well-formed at position " + e.getIndex());
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
										"L" === e.char(3) ? s = e.getMatch(r.elementdecl) : "N" === e.char(3) && (s = e.getMatch(r.EntityDecl));
										break;
									case "A":
										s = e.getMatch(r.AttlistDecl);
										break;
									case "N":
										s = e.getMatch(r.NotationDecl);
										break;
									case "-": s = e.getMatch(r.Comment);
								}
								else if ("<" === e.char() && "?" === e.char(1)) s = n(e, t);
								else {
									if ("%" !== e.char()) return t.fatalError("Error detected in Markup declaration");
									s = e.getMatch(r.PEReference);
								}
								if (!s) return t.fatalError("Error in internal subset at position " + e.getIndex());
							}
							return t.fatalError("doctype internal subset is not well-formed, missing ]");
						}
					}(a, o)), a.skipBlanks(), ">" !== a.char() ? o.fatalError("doctype not terminated with > at position " + a.getIndex()) : (a.skip(1), n.startDTD(c.name, c.publicId, c.systemId, c.internalSubset), n.endDTD(), a.getIndex());
				default: return o.fatalError("Not well-formed XML starting with \"<!\" at position " + t);
			}
		}
		function E(e, t, n, o) {
			var i = e.substring(t).match(r.PI);
			if (!i) return o.fatalError("Invalid processing instruction starting at position " + t);
			if ("xml" === i[1].toLowerCase()) {
				if (t > 0) return o.fatalError("processing instruction at position " + t + " is an xml declaration which is only at the start of the document");
				if (!r.XMLDecl.test(e.substring(t))) return o.fatalError("xml declaration is not well-formed");
			}
			return n.processingInstruction(i[1], i[2]), t + i[0].length;
		}
		function S() {
			this.attributeNames = Object.create(null);
		}
		S.prototype = {
			setTagName: function(e) {
				if (!r.QName_exact.test(e)) throw new Error("invalid tagName:" + e);
				this.tagName = e;
			},
			addValue: function(e, t, n) {
				if (!r.QName_exact.test(e)) throw new Error("invalid attribute:" + e);
				this.attributeNames[e] = this.length, this[this.length++] = {
					qName: e,
					value: t,
					offset: n
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
		var t = c(), r = p(), n = u(), o = f(), i = h(), a = r.DOMImplementation, s = t.hasDefaultHTMLNamespace, l = t.isHTMLMimeType, d = t.isValidMimeType, m = t.MIME_TYPE, g = t.NAMESPACE, w = n.ParseError, b = i.XMLReader;
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
		function E(e, t) {
			t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber;
		}
		function S(e, t, r) {
			return "string" == typeof e ? e.substr(t, r) : e.length >= t + r || t ? new java.lang.String(e, t, r) + "" : e;
		}
		function N(e, t) {
			e.currentElement ? e.currentElement.appendChild(t) : e.doc.appendChild(t);
		}
		y.prototype.parseFromString = function(e, r) {
			if (!d(r)) throw new TypeError("DOMParser.parseFromString: the provided mimeType \"" + r + "\" is not valid.");
			var n = this.assign(Object.create(null), this.xmlns), i = o.XML_ENTITIES, a = n[""] || null;
			s(r) ? (i = o.HTML_ENTITIES, a = g.HTML) : r === m.XML_SVG_IMAGE && (a = g.SVG), n[""] = a, n.xml = n.xml || g.XML;
			var l = new this.domHandler({
				mimeType: r,
				defaultNamespace: a,
				onError: this.onError
			}), c = this.locator ? {} : void 0;
			this.locator && l.setDocumentLocator(c);
			var u = new b();
			return u.errorHandler = l, u.domBuilder = l, t.isHTMLMimeType(r) || "string" == typeof e || u.errorHandler.fatalError("source is not a string"), u.parse(this.normalizeLineEndings(String(e)), n, i), l.doc.documentElement || u.errorHandler.fatalError("missing root element"), l.doc;
		}, x.prototype = {
			startDocument: function() {
				var e = new a();
				this.doc = l(this.mimeType) ? e.createHTMLDocument(!1) : e.createDocument(this.defaultNamespace, "");
			},
			startElement: function(e, t, r, n) {
				var o = this.doc, i = o.createElementNS(e, r || t), a = n.length;
				N(this, i), this.currentElement = i, this.locator && E(this.locator, i);
				for (var s = 0; s < a; s++) {
					e = n.getURI(s);
					var l = n.getValue(s), c = (r = n.getQName(s), o.createAttributeNS(e, r));
					this.locator && E(n.getLocator(s), c), c.value = c.nodeValue = l, i.setAttributeNode(c);
				}
			},
			endElement: function(e, t, r) {
				this.currentElement = this.currentElement.parentNode;
			},
			startPrefixMapping: function(e, t) {},
			endPrefixMapping: function(e) {},
			processingInstruction: function(e, t) {
				var r = this.doc.createProcessingInstruction(e, t);
				this.locator && E(this.locator, r), N(this, r);
			},
			ignorableWhitespace: function(e, t, r) {},
			characters: function(e, t, r) {
				if (e = S.apply(this, arguments)) {
					if (this.cdata) var n = this.doc.createCDATASection(e);
					else n = this.doc.createTextNode(e);
					this.currentElement ? this.currentElement.appendChild(n) : /^\s*$/.test(e) && this.doc.appendChild(n), this.locator && E(this.locator, n);
				}
			},
			skippedEntity: function(e) {},
			endDocument: function() {
				this.doc.normalize();
			},
			setDocumentLocator: function(e) {
				e && (e.lineNumber = 0), this.locator = e;
			},
			comment: function(e, t, r) {
				e = S.apply(this, arguments);
				var n = this.doc.createComment(e);
				this.locator && E(this.locator, n), N(this, n);
			},
			startCDATA: function() {
				this.cdata = !0;
			},
			endCDATA: function() {
				this.cdata = !1;
			},
			startDTD: function(e, t, r, n) {
				var o = this.doc.implementation;
				if (o && o.createDocumentType) {
					var i = o.createDocumentType(e, t, r, n);
					this.locator && E(this.locator, i), N(this, i), this.doc.doctype = i;
				}
			},
			reportError: function(e, t) {
				if ("function" == typeof this.onError) try {
					this.onError(e, t, this);
				} catch (r) {
					throw new w("Reporting " + e + " \"" + t + "\" caused " + r, this.locator);
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
		var r = u();
		e.DOMException = r.DOMException, e.DOMExceptionName = r.DOMExceptionName, e.ExceptionCode = r.ExceptionCode, e.ParseError = r.ParseError;
		var n = p();
		e.Attr = n.Attr, e.CDATASection = n.CDATASection, e.CharacterData = n.CharacterData, e.Comment = n.Comment, e.Document = n.Document, e.DocumentFragment = n.DocumentFragment, e.DocumentType = n.DocumentType, e.DOMImplementation = n.DOMImplementation, e.Element = n.Element, e.Entity = n.Entity, e.EntityReference = n.EntityReference, e.LiveNodeList = n.LiveNodeList, e.NamedNodeMap = n.NamedNodeMap, e.Node = n.Node, e.NodeList = n.NodeList, e.Notation = n.Notation, e.ProcessingInstruction = n.ProcessingInstruction, e.Text = n.Text, e.XMLSerializer = n.XMLSerializer;
		var o = m();
		e.DOMParser = o.DOMParser, e.normalizeLineEndings = o.normalizeLineEndings, e.onErrorStopParsing = o.onErrorStopParsing, e.onWarningStopParsing = o.onWarningStopParsing;
	}), w = s(l(), 1), b = g();
	function v(e) {
		return `${e}:${crypto.randomUUID()}`;
	}
	function y() {
		return v("bookmark");
	}
	function x() {
		return v("comment");
	}
	function E(e = "") {
		return {
			id: v("run"),
			text: e,
			kind: "text"
		};
	}
	function S(e = "") {
		return {
			id: v("paragraph"),
			type: "paragraph",
			runs: [E(e)]
		};
	}
	function N(e) {
		return {
			id: v("paragraph"),
			type: "paragraph",
			runs: e.length > 0 ? e.map((e) => function(e = "", t, r, n) {
				const o = {
					id: v("run"),
					text: e
				};
				return t && (o.styles = { ...t }), r ? {
					...o,
					kind: "image",
					image: { ...r }
				} : n ? {
					...o,
					kind: "textBox",
					textBox: n
				} : {
					...o,
					kind: "text"
				};
			}(e.text, e.styles, e.image, e.textBox)) : [E("")]
		};
	}
	function k(e, t = 1, r) {
		const n = {
			id: v("table-cell"),
			blocks: e.length > 0 ? e : [S("")]
		};
		return t > 1 && (n.colSpan = t), r?.rowSpan && r.rowSpan > 1 && (n.rowSpan = r.rowSpan), r?.vMerge && (n.vMerge = r.vMerge), n;
	}
	function _(e, t) {
		const r = {
			id: v("table-row"),
			cells: e
		};
		return t?.isHeader && (r.isHeader = !0), r;
	}
	const T = 96 / 72, I = 9525, A = 12700, C = 1440, R = 1e5, $ = 6e4, D = 14.6667, P = (e) => ({
		width: .5,
		type: "solid",
		color: e
	});
	function F(e, t, r) {
		const n = `${r ? "MediumShading1" : "LightShading"}-Accent${e}`, o = P(r ? "#ffffff" : t.accent);
		return {
			id: n,
			name: `${r ? "Medium Shading 1" : "Light Shading"} Accent ${e}`,
			type: "table",
			qFormat: !0,
			uiPriority: (r ? 40 : 20) + e,
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
					wholeTable: { shading: r ? t.tint : "#ffffff" },
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
	const M = {
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
					borderTop: P("#7f7f7f"),
					borderRight: P("#7f7f7f"),
					borderBottom: P("#7f7f7f"),
					borderLeft: P("#7f7f7f"),
					borderInsideH: P("#7f7f7f"),
					borderInsideV: P("#7f7f7f")
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
			const r = t + 1, n = F(r, e, !1), o = F(r, e, !0);
			return [[n.id, n], [o.id, o]];
		}))
	}, O = {
		normal: {
			id: "normal",
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
				fontSize: D
			}
		},
		header: {
			id: "header",
			name: "Header",
			type: "paragraph",
			semiHidden: !0,
			basedOn: "normal",
			nextStyle: "header",
			paragraphStyle: { spacingAfter: 0 }
		},
		footer: {
			id: "footer",
			name: "Footer",
			type: "paragraph",
			semiHidden: !0,
			basedOn: "normal",
			nextStyle: "footer",
			paragraphStyle: { spacingAfter: 0 }
		},
		heading1: {
			id: "heading1",
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
			name: "Footnote Reference",
			type: "character",
			semiHidden: !0,
			basedOn: "normal",
			textStyle: { superscript: !0 }
		},
		Caption: {
			id: "Caption",
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
		...M
	};
	function L(e, t = "value") {
		const r = e && "object" == typeof e && "type" in e ? e.type : e;
		throw new Error(`Unhandled ${t}: ${String(r)}`);
	}
	function B(e) {
		return "footnoteReference" === e.kind ? e.footnoteReference : void 0;
	}
	function U(e) {
		return "endnoteReference" === e.kind ? e.endnoteReference : void 0;
	}
	function z(e, t) {
		switch (e.kind) {
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
			default: return L(e, "run kind");
		}
	}
	const H = "asset:";
	const j = {
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
		fontSize: D,
		color: "#000000",
		highlight: null,
		shading: null,
		language: null,
		link: null
	}, q = {
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
	}, W = 816, G = 1056, V = "portrait", X = {
		top: 96,
		right: 96,
		bottom: 96,
		left: 96,
		header: 48,
		footer: 48,
		gutter: 0
	};
	function Z(e) {
		const t = e.orientation ?? (r = e.width, n = e.height, r > n ? "landscape" : "portrait");
		var r, n;
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
	function Y(e) {
		const t = e.pageSettings;
		return Z({
			width: t?.width ?? W,
			height: t?.height ?? G,
			orientation: t?.orientation ?? V,
			margins: {
				top: t?.margins.top ?? X.top,
				right: t?.margins.right ?? X.right,
				bottom: t?.margins.bottom ?? X.bottom,
				left: t?.margins.left ?? X.left,
				header: t?.margins.header ?? X.header,
				footer: t?.margins.footer ?? X.footer,
				gutter: t?.margins.gutter ?? X.gutter
			},
			...t?.columns ? { columns: t.columns } : {}
		});
	}
	function Q() {
		return { merge(e, t) {
			if (!t) return { ...e };
			const r = { ...e };
			for (const [n, o] of Object.entries(t)) void 0 !== o && (r[n] = o);
			return r;
		} };
	}
	const K = Q(), J = Q();
	function ee(e, t) {
		return K.merge(e, t);
	}
	function te(e) {
		if (!e) return;
		const t = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.id.toLowerCase());
		if (t) return t.id;
		const r = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.name.toLowerCase());
		return r ? r.id : void 0;
	}
	function re(e, t) {
		if (!e || !t || !t[e]) return {};
		const r = t[e];
		return {
			...r.basedOn ? re(r.basedOn, t) : {},
			...r.textStyle ?? {}
		};
	}
	function ne(e, t) {
		if (!e || !t || !t[e]) return {};
		const r = t[e];
		return {
			...r.basedOn ? ne(r.basedOn, t) : {},
			...r.paragraphStyle ?? {}
		};
	}
	function oe(e, t, r) {
		const n = ee(ee(re(t ?? te(r), r), re(e?.styleId, r)), e);
		return {
			...j,
			...n
		};
	}
	function ie(e, t) {
		const r = e?.styleId ?? te(t), n = (o = ne(r, t), i = {
			...e,
			styleId: r
		}, J.merge(o, i));
		var o, i;
		return {
			...q,
			...n
		};
	}
	function ae(e, t) {
		if (!t) return "";
		if (!t.startsWith("asset:")) return t;
		const r = t.slice(6);
		return (e?.assets?.[r])?.url ?? t;
	}
	function se(e) {
		return e.sections && e.sections.length > 0 ? e.sections.map((e) => ({
			...e,
			pageSettings: Z(e.pageSettings)
		})) : [{
			id: "section:default",
			blocks: [],
			pageSettings: Y(e)
		}];
	}
	function le(e) {
		return se(e);
	}
	function ce(e) {
		switch (e.type) {
			case "paragraph": return [e];
			case "table": return e.rows.flatMap((e) => e.cells.flatMap((e) => e.blocks.flatMap(ce)));
			default: return L(e, "block");
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
	function ue(e) {
		const t = Object.fromEntries(Object.entries(M).filter(([t]) => !(t in e)));
		return {
			...e,
			...t
		};
	}
	function de(e, t, r, n, o, i) {
		const a = Z(t ? {
			width: t.width,
			height: t.height,
			orientation: t.orientation,
			margins: { ...t.margins },
			...t.columns ? { columns: t.columns } : {}
		} : {
			width: W,
			height: G,
			orientation: V,
			margins: { ...X }
		});
		return {
			schemaVersion: 1,
			id: v("document"),
			pageSettings: a,
			sections: r ?? [{
				id: "section:default",
				blocks: e,
				pageSettings: a
			}],
			styles: n ? ue(n) : { ...O },
			metadata: o ?? { title: "Untitled document" },
			assets: i ?? void 0
		};
	}
	const pe = { supportedNamespaces: /* @__PURE__ */ new Set() };
	function fe(e, ...t) {
		return { supportedNamespaces: /* @__PURE__ */ new Set([...e.supportedNamespaces, ...t]) };
	}
	function he(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function me(e) {
		const t = e.parentNode;
		return 1 === t?.nodeType ? t : null;
	}
	function ge(e, t) {
		let r = e;
		const n = t ? `xmlns:${t}` : "xmlns";
		for (; r;) {
			const e = r.getAttribute(n);
			if (e) return e;
			r = me(r);
		}
	}
	function we(e, t) {
		return e.getAttributeNS("http://schemas.openxmlformats.org/markup-compatibility/2006", t) ?? e.getAttribute(`mc:${t}`) ?? void 0;
	}
	function be(e, t) {
		const r = [];
		let n = e;
		for (; n;) r.push(n), n = me(n);
		const o = [];
		for (const i of r.reverse()) {
			const e = we(i, t);
			if (e) for (const t of e.split(/\s+/).filter(Boolean)) o.push({
				element: i,
				token: t
			});
		}
		return o;
	}
	function ve(e, t) {
		const r = t.indexOf(":");
		if (r < 1 || r === t.length - 1) return;
		const n = t.slice(0, r), o = t.slice(r + 1), i = ge(e, n);
		return i ? `${i}\0${o}` : void 0;
	}
	function ye(e, t) {
		const r = e.getAttribute("Requires")?.trim();
		return !!r && r.split(/\s+/).every((r) => {
			const n = ge(e, r);
			return Boolean(n && t.supportedNamespaces.has(n));
		});
	}
	function xe(e, t) {
		let r;
		for (const n of he(e)) if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === n.namespaceURI) {
			if ("Choice" === n.localName && ye(n, t)) return n;
			"Fallback" === n.localName && (r = n);
		}
		return r;
	}
	function Ee(e, t = pe) {
		const r = [], n = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const r of be(e, "Ignorable")) {
				const e = ge(r.element, r.token);
				e && t.add(e);
			}
			return t;
		}(e), o = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const r of be(e, "ProcessContent")) {
				const e = ve(r.element, r.token);
				e && t.add(e);
			}
			return t;
		}(e);
		for (const i of he(e)) {
			if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === i.namespaceURI && "AlternateContent" === i.localName) {
				const e = xe(i, t);
				e && r.push(...Ee(e, t));
				continue;
			}
			const e = i.namespaceURI ?? "";
			if (n.has(e) && !t.supportedNamespaces.has(e)) {
				const n = `${e}\0${i.localName ?? i.tagName}`;
				o.has(n) && r.push(...Ee(i, t));
				continue;
			}
			r.push(i);
		}
		return r;
	}
	const Se = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Ne = "http://schemas.openxmlformats.org/drawingml/2006/main", ke = "http://schemas.microsoft.com/office/word/2010/wordml", _e = fe(pe, ke), Te = fe(pe, "http://schemas.microsoft.com/office/word/2012/wordml");
	function Ie(e, t, r) {
		return e ? Ee(e).filter((e) => e.namespaceURI === t && e.localName === r) : [];
	}
	const Ae = [
		"lrTb",
		"tbRl",
		"btLr",
		"lrTbV",
		"tbRlV"
	];
	function Ce(e) {
		return Ae.includes(e) ? e : void 0;
	}
	function Re(e, t, r) {
		return Ie(e, t, r)[0] ?? null;
	}
	function $e(e, t) {
		return e ? Ee(e, _e).find((e) => "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function De(e, t) {
		return e ? Ee(e, Te).find((e) => "http://schemas.microsoft.com/office/word/2012/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function Pe(e, t) {
		return e ? e.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2010/wordml", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2012/wordml", t) ?? e.getAttribute(`w:${t}`) ?? e.getAttribute(`w14:${t}`) ?? e.getAttribute(`w15:${t}`) ?? e.getAttribute(t) : null;
	}
	function Fe(e, t) {
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			if (1 === n?.nodeType) {
				const e = n;
				if (e.localName === t) return e;
				const r = Fe(e, t);
				if (r) return r;
			}
		}
		return null;
	}
	function Me(e) {
		const t = {}, r = e.attributes;
		for (let n = 0; n < r.length; n += 1) {
			const e = r[n];
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
	function Oe(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function Le(e, t) {
		const r = Re(e, Se, t);
		if (!r) return;
		const n = Pe(r, "val");
		return null == n || "0" !== n && "false" !== n && "off" !== n && Oe(n);
	}
	function Be(e, t) {
		return Pe(Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", t), "val") ?? void 0;
	}
	async function Ue(e, t) {
		t > 0 && t % e === 0 && await new Promise((e) => setTimeout(e, 0));
	}
	const ze = {
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
	}, He = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/gif": "gif",
		"image/bmp": "bmp",
		"image/tiff": "tif",
		"image/svg+xml": "svg",
		"image/x-emf": "emf",
		"image/x-wmf": "wmf"
	};
	function je(e) {
		return He[e.toLowerCase()] ?? null;
	}
	async function qe(e, t, r) {
		let n = r;
		n.startsWith("/") && (n = n.slice(1)), n.startsWith("word/") || (n = "word/" + r);
		const o = e.file(n), i = function(e) {
			const t = e.split(".").pop()?.toLowerCase();
			return t ? ze[t] ?? null : null;
		}(r) ?? "image/png", a = await o?.async("base64");
		if (a) return function(e, t, r) {
			const n = e.byPath.get(t);
			if (n) return `${H}${n}`;
			const o = `img-${e.nextId}`;
			return e.nextId += 1, e.assets[o] = {
				id: o,
				url: r
			}, e.byPath.set(t, o), `${H}${o}`;
		}(t, n, `data:${i};base64,${a}`);
	}
	function We(e) {
		const t = /* @__PURE__ */ new Map();
		if (!e) return t;
		const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement?.childNodes;
		if (!r) return t;
		for (let n = 0; n < r.length; n += 1) {
			const e = r[n];
			if (1 === e?.nodeType) {
				const r = e;
				if ("Relationship" === r.localName) {
					const e = r.getAttribute("Id"), n = r.getAttribute("Target");
					e && n && t.set(e, n);
				}
			}
		}
		return t;
	}
	async function Ge(e, t) {
		const r = t.lastIndexOf("/"), n = r >= 0 ? t.slice(0, r) : "", o = r >= 0 ? t.slice(r + 1) : t, i = n ? `${n}/_rels/${o}.rels` : `_rels/${o}.rels`;
		return We(await e.file(i)?.async("string"));
	}
	const Ve = (e) => Re(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "latin")?.getAttribute("typeface")?.trim() || void 0, Xe = (e) => Re(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "cs")?.getAttribute("typeface")?.trim() || Ve(e), Ze = (e) => Re(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "ea")?.getAttribute("typeface")?.trim() || Ve(e);
	function Ye(e, t) {
		const r = 10 ** t;
		return Math.round(e * r) / r;
	}
	function Qe(e, t) {
		const r = e ? Number(e) : NaN;
		return Number.isFinite(r) ? Math.round(r / C * 96) : t;
	}
	function Ke(e) {
		const t = e ? Number(e) : NaN;
		if (Number.isFinite(t)) return Ye(t / 20, 4);
	}
	function Je(e) {
		const t = e?.trim();
		if (t && "auto" !== t && "none" !== t) return t.startsWith("#") ? t : `#${t.toUpperCase()}`;
	}
	const et = [
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
	function tt(e) {
		const t = Re(e, Ne, "srgbClr");
		if (t) return Je(Pe(t, "val"));
		const r = Re(e, Ne, "sysClr");
		return r ? Je(Pe(r, "lastClr")) : void 0;
	}
	function rt(e) {
		if (!e) return;
		const t = Number.parseInt(e, 16);
		return Number.isFinite(t) ? t / 255 : void 0;
	}
	function nt(e, t, r) {
		const n = (e) => function(e) {
			return Math.min(255, Math.max(0, Math.round(e)));
		}(e).toString(16).padStart(2, "0").toUpperCase();
		return `#${n(e)}${n(t)}${n(r)}`;
	}
	function ot(e, t) {
		const r = Pe(e, "themeColor");
		if (!r) return;
		const n = function(e) {
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
		}(r), o = n ? t[n] : void 0;
		if (!o) return;
		let i = Number.parseInt(o.slice(1, 3), 16), a = Number.parseInt(o.slice(3, 5), 16), s = Number.parseInt(o.slice(5, 7), 16);
		const l = rt(Pe(e, "themeShade"));
		void 0 !== l && (i *= l, a *= l, s *= l);
		const c = rt(Pe(e, "themeTint"));
		if (void 0 !== c) {
			const e = 255 * (1 - c);
			i = i * c + e, a = a * c + e, s = s * c + e;
		}
		return nt(i, a, s);
	}
	function it(e) {
		if (!e) return {
			fonts: {},
			colors: {}
		};
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement, r = t ? Ie(t, "http://schemas.openxmlformats.org/drawingml/2006/main", "themeElements")[0] ?? null : null, n = function(e) {
			const t = Re(e, Ne, "fontScheme"), r = Re(t, Ne, "majorFont"), n = Re(t, Ne, "minorFont");
			return {
				majorHAnsi: Ve(r),
				minorHAnsi: Ve(n),
				majorEastAsia: Ze(r),
				minorEastAsia: Ze(n),
				majorBidi: Xe(r),
				minorBidi: Xe(n)
			};
		}(r), o = function(e) {
			const t = Re(e, Ne, "clrScheme");
			if (!t) return {};
			const r = {};
			for (const n of et) {
				const e = tt(Re(t, Ne, n));
				e && (r[n] = e);
			}
			return r;
		}(r), i = r ? Ie(r, Ne, "fmtScheme")[0] : void 0;
		return {
			fonts: n,
			colors: o,
			data: {
				name: t?.getAttribute("name") || void 0,
				colors: { ...o },
				fonts: {
					major: Object.fromEntries(Object.entries(n).filter(([e]) => e.startsWith("major"))),
					minor: Object.fromEntries(Object.entries(n).filter(([e]) => e.startsWith("minor")))
				},
				effectsXml: i ? Array.from(i.childNodes).map((e) => new b.XMLSerializer().serializeToString(e)).join("") : void 0,
				sourceXml: e
			}
		};
	}
	const at = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, st = {
		continuous: "continuous",
		eachSect: "eachSection"
	};
	function lt(e) {
		if (!e) return;
		const t = {}, r = Pe(Re(e, Se, "numFmt"), "val");
		r && at[r] && (t.numberFormat = at[r]);
		const n = Number.parseInt(Pe(Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "numStart"), "val") ?? "", 10);
		Number.isFinite(n) && n > 0 && (t.startAt = n);
		const o = Pe(Re(e, Se, "numRestart"), "val");
		return o && st[o] && (t.restart = st[o]), Object.keys(t).length > 0 ? t : void 0;
	}
	function ct(e) {
		return e.ooxmlNumbering;
	}
	function ut(e) {
		const t = ct(e);
		if (t?.format && t.importedKind === e.kind && t.importedFormat === e.format) return t.format;
	}
	function dt(e) {
		if (!e) return;
		const t = Pe(e, "id"), r = Pe(e, "author"), n = Pe(e, "date");
		if (!t || !r || !n) return;
		const o = Date.parse(n);
		return Number.isFinite(o) ? {
			id: t,
			author: r,
			date: o
		} : void 0;
	}
	const pt = {
		decimal: "decimal",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		bullet: "bullet"
	};
	function ft(e) {
		const t = Pe(e, "val");
		if (null == t) return;
		const r = Number.parseInt(t, 10);
		return Number.isFinite(r) ? r : void 0;
	}
	function ht(e, t) {
		if (!e || !/^\d+$/.test(e)) return;
		const r = Number.parseInt(e, 10);
		return Number.isSafeInteger(r) && r >= t ? r : void 0;
	}
	function mt(e) {
		const t = {}, r = Pe(Re(e, Se, "numFmt"), "val");
		r && (t.kind = "bullet" === r ? "bullet" : "ordered", t.format = pt[r], t.rawFormat = r);
		const n = Pe(Re(e, Se, "suff"), "val");
		"tab" !== n && "space" !== n && "nothing" !== n || (t.suffix = n);
		const o = ft(Re(e, Se, "start"));
		void 0 !== o && (t.startAt = o), t.levelText = Pe(Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "lvlText"), "val") ?? void 0;
		const i = Pe(Re(e, Se, "lvlJc"), "val");
		"left" !== i && "center" !== i && "right" !== i || (t.alignment = i);
		const a = Re(e, Se, "isLgl");
		a && (t.legal = function(e) {
			return null == e || "1" === e || "true" === e || "on" === e;
		}(Pe(a, "val")));
		const s = ft(Re(e, Se, "lvlRestart"));
		void 0 !== s && (t.restartAfterLevel = s), t.paragraphStyleId = Pe(Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "pStyle"), "val") ?? void 0, "bullet" === t.kind && t.levelText && (t.bulletGlyph = t.levelText);
		const c = Re(Re(e, Se, "rPr"), Se, "rFonts");
		t.bulletFont = Pe(c, "ascii") ?? Pe(c, "hAnsi") ?? void 0;
		const d = Re(Re(e, Se, "pPr"), Se, "ind");
		if (d) {
			const e = Pe(d, "left") ?? Pe(d, "start"), r = Pe(d, "hanging"), n = null != e ? Qe(e, 0) : void 0, o = null != r ? Qe(r, 0) : void 0;
			void 0 === n && void 0 === o || (t.indent = {
				left: n,
				hanging: o
			});
		}
		return t;
	}
	function gt(e, t, r) {
		const n = e.numToAbstractId.get(t), o = n ? e.abstractLevels.get(`${n}:${r}`) : void 0;
		return e.numOverrideLevels.get(`${t}:${r}`) ?? o ?? {};
	}
	function wt(e) {
		if (!e) return;
		const t = Pe(e, "val");
		if ("nil" === t || "none" === t) return {
			width: 0,
			type: "none",
			color: "transparent"
		};
		const r = Number(Pe(e, "sz")), n = Number.isFinite(r) && r > 0 ? Ye(r / 8, 4) : .75, o = Je(Pe(e, "color")) ?? "#000000", i = t?.toLowerCase() ?? "single";
		return {
			width: n,
			type: i.includes("dotted") || i.includes("dot") ? "dotted" : i.includes("dash") ? "dashed" : "solid",
			color: o
		};
	}
	function bt(e) {
		return e ? {
			borderTop: wt(Re(e, Se, "top")),
			borderRight: wt(Re(e, Se, "right")),
			borderBottom: wt(Re(e, Se, "bottom")),
			borderLeft: wt(Re(e, Se, "left")),
			borderStart: wt(Re(e, Se, "start")),
			borderEnd: wt(Re(e, Se, "end")),
			borderTopLeftToBottomRight: wt(Re(e, Se, "tl2br")),
			borderTopRightToBottomLeft: wt(Re(e, Se, "tr2bl")),
			borderBetween: wt(Re(e, Se, "between")),
			borderBar: wt(Re(e, Se, "bar"))
		} : {};
	}
	function vt(e) {
		const t = Object.entries(e).filter(([, e]) => void 0 !== e);
		return t.length > 0 ? Object.fromEntries(t) : void 0;
	}
	function yt(e) {
		return Object.keys(e).length > 0 ? e : void 0;
	}
	function xt(e, t) {
		return yt({
			...e ?? {},
			...t ?? {}
		});
	}
	function Et(e, t) {
		return Je(Pe(e, "fill")) || (t ? ot(e, t) : void 0);
	}
	function St(e) {
		const t = Re(e, ke, "solidFill");
		if (t) {
			const e = function(e) {
				const t = Re(e, ke, "srgbClr");
				if (!t) return null;
				const r = Pe(t, "val");
				return r ? Je(r) ?? null : null;
			}(t);
			if (e) return {
				type: "solid",
				color: e
			};
		}
		const r = Re(e, ke, "gradFill");
		if (r) {
			const e = Re(r, ke, "gsLst");
			if (e) {
				const t = [];
				for (let r = 0; r < e.childNodes.length; r++) {
					const n = e.childNodes[r];
					if (n?.nodeType !== n.ELEMENT_NODE) continue;
					const o = n;
					if ("http://schemas.microsoft.com/office/word/2010/wordml" !== o.namespaceURI || "gs" !== o.localName) continue;
					const i = Pe(o, "pos"), a = null !== i ? Number(i) / R : NaN;
					if (!Number.isFinite(a)) continue;
					const s = Re(o, ke, "srgbClr");
					if (!s) continue;
					const l = Pe(s, "val");
					if (!l) continue;
					const c = Je(l);
					if (!c) continue;
					const u = Re(s, ke, "alpha"), d = u ? Pe(u, "val") : null, p = null !== d ? Number(d) / R : void 0, f = {
						position: a,
						color: c
					};
					void 0 !== p && Number.isFinite(p) && (f.alpha = p), t.push(f);
				}
				if (t.length > 0) {
					const e = Re(r, ke, "lin"), n = e ? Pe(e, "ang") : null, o = null !== n ? Number(n) / $ : void 0, i = {
						type: "gradient",
						stops: t
					};
					return void 0 !== o && Number.isFinite(o) && (i.angle = o), i;
				}
			}
		}
		return null;
	}
	function Nt(e) {
		const t = Re(e, ke, "srgbClr");
		if (!t) return null;
		const r = Pe(t, "val"), n = r ? Je(r) ?? null : null;
		if (!n) return null;
		const o = Re(t, ke, "alpha"), i = o ? Pe(o, "val") : null, a = null !== i && Number.isFinite(Number(i)) ? Number(i) / R : void 0;
		return {
			color: n,
			...void 0 !== a ? { alpha: a } : {}
		};
	}
	function kt(e, t) {
		if (!e) return;
		const r = oe(e, t, O), n = oe(void 0, t, O), o = (e, t) => e !== t ? e : void 0, i = (e, t, r) => void 0 !== e ? e : o(t, r);
		return vt({
			styleId: e.styleId,
			bold: i(e.bold, r.bold, n.bold),
			italic: i(e.italic, r.italic, n.italic),
			underline: i(e.underline, r.underline, n.underline),
			underlineStyle: i(e.underlineStyle, r.underlineStyle, n.underlineStyle),
			underlineColor: o(r.underlineColor, n.underlineColor),
			strike: i(e.strike, r.strike, n.strike),
			doubleStrike: i(e.doubleStrike, r.doubleStrike, n.doubleStrike),
			superscript: i(e.superscript, r.superscript, n.superscript),
			subscript: i(e.subscript, r.subscript, n.subscript),
			smallCaps: i(e.smallCaps, r.smallCaps, n.smallCaps),
			allCaps: i(e.allCaps, r.allCaps, n.allCaps),
			hidden: i(e.hidden, r.hidden, n.hidden),
			noProof: i(e.noProof, r.noProof, n.noProof),
			webHidden: i(e.webHidden, r.webHidden, n.webHidden),
			specVanish: i(e.specVanish, r.specVanish, n.specVanish),
			rtl: i(e.rtl, r.rtl, n.rtl),
			complexScript: i(e.complexScript, r.complexScript, n.complexScript),
			snapToGrid: i(e.snapToGrid, r.snapToGrid, n.snapToGrid),
			outline: i(e.outline, r.outline, n.outline),
			shadow: i(e.shadow, r.shadow, n.shadow),
			emboss: i(e.emboss, r.emboss, n.emboss),
			imprint: i(e.imprint, r.imprint, n.imprint),
			fitText: o(r.fitText, n.fitText),
			emphasisMark: o(r.emphasisMark, n.emphasisMark),
			textBorder: o(r.textBorder, n.textBorder),
			textEffect: o(r.textEffect, n.textEffect),
			characterScale: o(r.characterScale, n.characterScale),
			characterSpacing: o(r.characterSpacing, n.characterSpacing),
			baselineShift: o(r.baselineShift, n.baselineShift),
			kerningThreshold: o(r.kerningThreshold, n.kerningThreshold),
			ligatures: o(r.ligatures, n.ligatures),
			numberSpacing: o(r.numberSpacing, n.numberSpacing),
			numberForm: o(r.numberForm, n.numberForm),
			stylisticSet: o(r.stylisticSet, n.stylisticSet),
			contextualAlternates: i(e.contextualAlternates, r.contextualAlternates, n.contextualAlternates),
			fontFamily: i(e.fontFamily, r.fontFamily, n.fontFamily),
			fontSize: i(e.fontSize, r.fontSize, n.fontSize),
			color: o(r.color, n.color),
			textFill: o(r.textFill, n.textFill),
			textOutline: o(r.textOutline, n.textOutline),
			textShadow: o(r.textShadow, n.textShadow),
			glow: o(r.glow, n.glow),
			reflection: o(r.reflection, n.reflection),
			scene3dXml: o(r.scene3dXml, n.scene3dXml),
			props3dXml: o(r.props3dXml, n.props3dXml),
			highlight: o(r.highlight, n.highlight),
			shading: o(r.shading, n.shading),
			language: o(r.language, n.language),
			link: o(r.link, n.link),
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: kt(e.propertyRevision.previous, t) ?? {}
			} : void 0
		});
	}
	function _t(e, t) {
		if (!e) return;
		const r = {}, n = Be(e, "rStyle");
		n && (r.styleId = n);
		const o = Le(e, "b"), i = Le(e, "bCs");
		void 0 === o && void 0 === i || (r.bold = !0 === o || !0 === i);
		const a = Le(e, "i"), s = Le(e, "iCs");
		void 0 === a && void 0 === s || (r.italic = !0 === a || !0 === s);
		const l = Le(e, "strike");
		void 0 !== l && (r.strike = l);
		const c = Le(e, "dstrike");
		void 0 !== c && (r.doubleStrike = c);
		const u = Le(e, "smallCaps");
		void 0 !== u && (r.smallCaps = u);
		const d = Le(e, "caps");
		void 0 !== d && (r.allCaps = d);
		const p = Le(e, "vanish");
		void 0 !== p && (r.hidden = p);
		const f = Le(e, "noProof");
		void 0 !== f && (r.noProof = f);
		const h = Le(e, "webHidden");
		void 0 !== h && (r.webHidden = h);
		const m = Le(e, "specVanish");
		void 0 !== m && (r.specVanish = m);
		const g = Le(e, "rtl");
		void 0 !== g && (r.rtl = g);
		const w = Le(e, "cs");
		void 0 !== w && (r.complexScript = w);
		const v = Le(e, "snapToGrid");
		void 0 !== v && (r.snapToGrid = v);
		const y = Le(e, "outline");
		void 0 !== y && (r.outline = y);
		const x = Le(e, "shadow");
		void 0 !== x && (r.shadow = x);
		const E = Le(e, "emboss");
		void 0 !== E && (r.emboss = E);
		const S = Le(e, "imprint");
		void 0 !== S && (r.imprint = S);
		const N = Pe(Re(e, Se, "em"), "val");
		"dot" !== N && "comma" !== N && "circle" !== N && "underDot" !== N && "none" !== N || (r.emphasisMark = N);
		const k = Pe(Re(e, Se, "fitText"), "val");
		if (k) {
			const e = Ke(k);
			void 0 !== e && e > 0 && (r.fitText = e);
		}
		const _ = wt(Re(e, Se, "bdr"));
		_ && (r.textBorder = _);
		const T = Pe(Re(e, Se, "effect"), "val");
		T && (r.textEffect = T);
		const I = Pe(Re(e, Se, "w"), "val");
		if (I) {
			const e = Number(I);
			Number.isFinite(e) && e > 0 && (r.characterScale = e);
		}
		const C = Pe(Re(e, Se, "spacing"), "val");
		if (C) {
			const e = Ke(C);
			void 0 !== e && (r.characterSpacing = e);
		}
		const D = Pe(Re(e, Se, "position"), "val");
		if (D) {
			const e = Number(D);
			Number.isFinite(e) && (r.baselineShift = e / 2);
		}
		const P = Pe(Re(e, Se, "kern"), "val");
		if (P) {
			const e = Number(P);
			Number.isFinite(e) && e >= 0 && (r.kerningThreshold = e / 2);
		}
		const F = Pe(Re(e, ke, "ligatures"), "val");
		"none" !== F && "standard" !== F && "contextual" !== F && "historical" !== F && "standardContextual" !== F || (r.ligatures = F);
		const M = Pe(Re(e, ke, "numSpacing"), "val");
		"proportional" !== M && "tabular" !== M || (r.numberSpacing = M);
		const O = Pe(Re(e, ke, "numForm"), "val");
		"lining" !== O && "oldStyle" !== O || (r.numberForm = O);
		const L = Pe(Re(e, ke, "stylisticSets"), "val");
		if (L) {
			const e = /^[0-9a-fA-F]+$/.test(L) && L.length > 2 ? Number.parseInt(L, 16) : Number(L);
			if (Number.isFinite(e) && e > 0) {
				for (let t = 1; t <= 20; t += 1) if (e & 1 << t - 1) {
					r.stylisticSet = t;
					break;
				}
			}
		}
		const B = Pe(Re(e, ke, "cntxtAlts"), "val");
		null === B ? Re(e, "http://schemas.microsoft.com/office/word/2010/wordml", "cntxtAlts") && (r.contextualAlternates = !0) : r.contextualAlternates = Oe(B);
		const U = Re(e, Se, "u"), z = Pe(U, "val");
		if (U) {
			r.underline = "none" !== z, r.underlineStyle = "none" === z ? null : z || "single";
			const e = Pe(U, "color");
			e && "auto" !== e && (r.underlineColor = Je(e));
		}
		const H = Pe(Re(e, Se, "vertAlign"), "val");
		"superscript" !== H && "subscript" !== H && "baseline" !== H || (r.superscript = "superscript" === H, r.subscript = "subscript" === H);
		const j = Re(e, Se, "rFonts"), q = Pe(j, "ascii") ?? Pe(j, "hAnsi") ?? Pe(j, "cs") ?? Pe(j, "eastAsia") ?? function(e, t) {
			const r = Pe(e, "asciiTheme") ?? Pe(e, "hAnsiTheme") ?? Pe(e, "eastAsiaTheme") ?? Pe(e, "cstheme");
			if (!r) return;
			const n = "majorAscii" === r || "majorHAnsi" === r ? "majorHAnsi" : "minorAscii" === r || "minorHAnsi" === r ? "minorHAnsi" : "majorEastAsia" === r ? "majorEastAsia" : "minorEastAsia" === r ? "minorEastAsia" : "majorBidi" === r ? "majorBidi" : "minorBidi" === r ? "minorBidi" : void 0;
			return n ? t[n] : void 0;
		}(j, t.fonts);
		q && (r.fontFamily = function(e) {
			const t = e?.trim();
			if (t) return `${/[\s,]/.test(t) ? `"${t.replace(/"/g, "\\\"")}"` : t}, ${/times/i.test(t) ? "serif" : "sans-serif"}`;
		}(q));
		const W = Pe(Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "sz") ?? Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "szCs"), "val");
		if (W) {
			const e = function(e) {
				const t = e ? Number(e) : NaN;
				return Number.isFinite(t) ? Ye(t / 2 / 72 * 96, 4) : null;
			}(W);
			null !== e && (r.fontSize = e);
		}
		const G = Re(e, Se, "color"), V = Pe(G, "val");
		if (V && "auto" !== V) r.color = Je(V);
		else if ("auto" !== V) {
			const e = ot(G, t.colors);
			e && (r.color = e);
		}
		const X = $e(e, "textFill");
		if (X) {
			const e = St(X);
			e && (r.textFill = e);
		}
		const Z = $e(e, "textOutline");
		if (Z) {
			const e = Z.getAttributeNS(ke, "w"), t = null !== e ? Number(e) : NaN, n = { widthPt: Number.isFinite(t) && t > 0 ? t / A : .5 }, o = St(Z);
			o && (n.fill = o, "solid" === o.type ? n.color = o.color : "gradient" === o.type && o.stops[0] && (n.color = o.stops[0].color)), r.textOutline = n;
		}
		const Y = $e(e, "shadow");
		if (Y) {
			const e = function(e) {
				const t = Nt(e);
				if (!t) return null;
				const r = e.getAttributeNS(ke, "blurRad"), n = e.getAttributeNS(ke, "dist"), o = e.getAttributeNS(ke, "dir"), i = r ? Number(r) / A : 0, a = n ? Number(n) / A : 0, s = o ? Number(o) / $ : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					blurPt: i,
					distPt: a,
					dirDeg: s
				};
			}(Y);
			e && (r.textShadow = e);
		}
		const Q = $e(e, "glow");
		if (Q) {
			const e = function(e) {
				const t = Nt(e);
				if (!t) return null;
				const r = e.getAttributeNS(ke, "rad"), n = r ? Number(r) / A : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					radiusPt: n
				};
			}(Q);
			e && (r.glow = e);
		}
		const K = $e(e, "reflection");
		K && (r.reflection = function(e) {
			const t = e.getAttributeNS(ke, "blurRad"), r = e.getAttributeNS(ke, "stA"), n = e.getAttributeNS(ke, "stPos"), o = e.getAttributeNS(ke, "endA"), i = e.getAttributeNS(ke, "endPos"), a = e.getAttributeNS(ke, "dist");
			return {
				blurPt: t ? Number(t) / A : 0,
				startAlpha: null !== r ? Number(r) / R : .55,
				startPos: null !== n ? Number(n) / R : 0,
				endAlpha: null !== o ? Number(o) / R : 0,
				endPos: null !== i ? Number(i) / R : 1,
				distPt: a ? Number(a) / A : 0
			};
		}(K));
		const J = $e(e, "scene3d");
		J && (r.scene3dXml = new b.XMLSerializer().serializeToString(J));
		const ee = $e(e, "props3d");
		ee && (r.props3dXml = new b.XMLSerializer().serializeToString(ee));
		const te = Pe(Re(e, Se, "highlight"), "val");
		te && "none" !== te && (r.highlight = te);
		const re = Et(Re(e, Se, "shd"), t.colors);
		re && (r.shading = re);
		const ne = Re(e, Se, "lang");
		if (ne) {
			const e = Pe(ne, "val"), t = Pe(ne, "eastAsia"), n = Pe(ne, "bidi"), o = {};
			e && (o.value = e), t && (o.eastAsia = t), n && (o.bidi = n), Object.keys(o).length > 0 && (r.language = o);
		}
		const oe = Re(e, Se, "rPrChange"), ie = dt(oe), ae = Re(oe, Se, "rPr");
		return ie && ae && (r.propertyRevision = {
			...ie,
			type: "property",
			previous: _t(ae, t) ?? {}
		}), yt(r);
	}
	const Tt = [
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
	], It = [
		["top", "borderTop"],
		["left", "borderLeft"],
		["bottom", "borderBottom"],
		["right", "borderRight"],
		["insideH", "borderInsideH"],
		["insideV", "borderInsideV"]
	];
	function At(e) {
		if (!e) return;
		const t = Pe(e, "type"), r = Pe(e, "w");
		if ("auto" === t) return "auto";
		if ("pct" === t) {
			if (!r) return;
			const e = r.trim().endsWith("%") ? Number.parseFloat(r) : Number(r) / 50;
			return Number.isFinite(e) ? `${Ye(e, 4)}%` : void 0;
		}
		return Ke(r);
	}
	function Ct(e, t) {
		const r = Pe(Re(e, Se, t), "val"), n = r ? Number(r) : NaN;
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : void 0;
	}
	function Rt(e) {
		const t = Re(e, Se, "cnfStyle");
		if (!t) return;
		const r = Pe(t, "val") ?? "", n = {};
		return Tt.forEach(([e, o], i) => {
			const a = Pe(t, e);
			"1" === a || "true" === a || "on" === a ? n[o] = !0 : "0" === a || "false" === a || "off" === a ? n[o] = !1 : 12 === r.length && "1" === r[i] && (n[o] = !0);
		}), Object.keys(n).length > 0 ? n : void 0;
	}
	function $t(e) {
		const t = Pe(e, "date"), r = t ? Date.parse(t) : NaN;
		return {
			id: Pe(e, "id") ?? `revision:${e.localName}`,
			author: Pe(e, "author") ?? "Unknown",
			date: Number.isFinite(r) ? r : 0
		};
	}
	function Dt(e) {
		if (!e) return;
		const t = Re(e, Se, "tblPrEx");
		return t ? {
			...$t(e),
			type: "property",
			previous: Ft(t) ?? {}
		} : void 0;
	}
	function Pt(e) {
		if (!e) return;
		const t = (t) => Ke(Pe(Re(e, Se, t), "w")), r = {}, n = t("top"), o = t("right"), i = t("bottom"), a = t("left"), s = t("start"), l = t("end");
		return void 0 !== n && (r.top = n), void 0 !== o && (r.right = o), void 0 !== i && (r.bottom = i), void 0 !== a && (r.left = a), void 0 !== s && (r.start = s), void 0 !== l && (r.end = l), Object.keys(r).length > 0 ? r : void 0;
	}
	function Ft(e, t) {
		const r = {};
		t && (r.styleId = t);
		const n = Pe(Re(e, Se, "tblCaption"), "val");
		n && (r.altTitle = n);
		const o = Pe(Re(e, Se, "tblDescription"), "val");
		o && (r.altDescription = o);
		const i = At(Re(e, Se, "tblW"));
		void 0 !== i && (r.width = i);
		const a = At(Re(e, Se, "tblInd"));
		void 0 !== a && (r.indentLeft = a);
		const s = Pe(Re(e, Se, "jc"), "val");
		"left" === s || "start" === s ? r.align = "left" : "center" === s ? r.align = "center" : "right" !== s && "end" !== s || (r.align = "right");
		const l = function(e) {
			const t = Pe(Re(e, Se, "tblLayout"), "type");
			return "fixed" === t || "autofit" === t ? t : void 0;
		}(e);
		l && (r.layout = l);
		const c = At(Re(e, Se, "tblCellSpacing"));
		void 0 !== c && (r.cellSpacing = c);
		const u = (d = Re(e, Se, "tblBorders")) ? {
			...bt(d),
			borderInsideH: wt(Re(d, Se, "insideH")),
			borderInsideV: wt(Re(d, Se, "insideV"))
		} : {};
		var d;
		Object.keys(u).length > 0 && (r.borders = u);
		const p = Pt(Re(e, Se, "tblCellMar"));
		p && (r.defaultCellMargins = p);
		const f = e ? Le(e, "bidiVisual") : void 0;
		void 0 !== f && (r.bidiVisual = f);
		const h = Pe(Re(e, Se, "tblOverlap"), "val");
		"overlap" !== h && "never" !== h || (r.tblOverlap = h);
		const m = function(e) {
			const t = Re(e, Se, "tblpPr");
			if (!t || !t.attributes || 0 === t.attributes.length) return;
			const r = {};
			for (let l = 0; l < t.attributes.length; l += 1) {
				const e = t.attributes.item(l);
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e?.namespaceURI && "w" !== e?.prefix || (r[e.localName || e.name.replace(/^w:/, "")] = e.value);
			}
			const n = (e) => Ke(r[e] ?? null), o = "margin" === r.horzAnchor || "page" === r.horzAnchor || "text" === r.horzAnchor ? r.horzAnchor : void 0, i = "margin" === r.vertAnchor || "page" === r.vertAnchor || "text" === r.vertAnchor ? r.vertAnchor : void 0, a = "left" === r.tblpXSpec || "center" === r.tblpXSpec || "right" === r.tblpXSpec || "inside" === r.tblpXSpec || "outside" === r.tblpXSpec ? r.tblpXSpec : void 0, s = "top" === r.tblpYSpec || "center" === r.tblpYSpec || "bottom" === r.tblpYSpec || "inside" === r.tblpYSpec || "outside" === r.tblpYSpec ? r.tblpYSpec : void 0;
			return {
				...o ? { horizontalAnchor: o } : {},
				...i ? { verticalAnchor: i } : {},
				...void 0 !== n("tblpX") ? { x: n("tblpX") } : {},
				...void 0 !== n("tblpY") ? { y: n("tblpY") } : {},
				...a ? { xAlign: a } : {},
				...s ? { yAlign: s } : {},
				...void 0 !== n("topFromText") ? { distanceTop: n("topFromText") } : {},
				...void 0 !== n("rightFromText") ? { distanceRight: n("rightFromText") } : {},
				...void 0 !== n("bottomFromText") ? { distanceBottom: n("bottomFromText") } : {},
				...void 0 !== n("leftFromText") ? { distanceLeft: n("leftFromText") } : {}
			};
		}(e);
		m && (r.floating = m);
		const g = Ct(e, "tblStyleRowBandSize");
		void 0 !== g && (r.rowBandSize = g);
		const w = Ct(e, "tblStyleColBandSize");
		void 0 !== w && (r.colBandSize = w);
		const b = Re(e, Se, "tblLook");
		if (b) {
			const e = Pe(b, "val"), t = e ? Number.parseInt(e, 16) : NaN, n = (e, r, n) => {
				const o = Pe(b, e);
				return null !== o && "" !== o ? "1" === o || "true" === o || "on" === o : Number.isFinite(t) ? 0 !== (t & r) : n;
			};
			r.tblLook = {
				firstRow: n("firstRow", 32, !0),
				lastRow: n("lastRow", 64, !1),
				firstCol: n("firstColumn", 128, !0),
				lastCol: n("lastColumn", 256, !1),
				noHBand: n("noHBand", 512, !1),
				noVBand: n("noVBand", 1024, !1)
			};
		}
		const v = Re(e, Se, "tblPrChange"), y = Re(v, Se, "tblPr");
		return v && y && (r.revision = {
			...$t(v),
			type: "property",
			previous: Ft(y) ?? {}
		}), yt(r);
	}
	function Mt(e) {
		if (!e) return;
		const t = {}, r = Le(e, "tblHeader");
		void 0 !== r && (t.isHeader = r);
		const n = Ct(e, "gridBefore");
		void 0 !== n && (t.gridBefore = n);
		const o = Ct(e, "gridAfter");
		void 0 !== o && (t.gridAfter = o);
		const i = At(Re(e, Se, "wBefore"));
		void 0 !== i && (t.widthBefore = i);
		const a = At(Re(e, Se, "wAfter"));
		void 0 !== a && (t.widthAfter = a);
		const s = Re(e, Se, "trHeight"), l = Ke(Pe(s, "val"));
		void 0 !== l && (t.height = l);
		const c = Pe(s, "hRule");
		"auto" !== c && "exact" !== c && "atLeast" !== c || (t.heightRule = c);
		const u = At(Re(e, Se, "tblCellSpacing"));
		void 0 !== u && (t.cellSpacing = u);
		const d = Pe(Re(e, Se, "jc"), "val");
		"left" === d || "start" === d ? t.align = "left" : "center" === d ? t.align = "center" : "right" !== d && "end" !== d || (t.align = "right");
		const p = Le(e, "cantSplit");
		void 0 !== p && (t.cantSplit = p);
		const f = Le(e, "hidden");
		void 0 !== f && (t.hidden = f);
		const h = Re(e, Se, "trPrChange"), m = Re(h, Se, "trPr");
		h && m && (t.propertyRevision = {
			...$t(h),
			type: "property",
			previous: Mt(m) ?? {}
		});
		const g = Re(e, Se, "ins"), w = Re(e, Se, "del"), b = g ?? w;
		return b && (t.revision = {
			...$t(b),
			type: g ? "insert" : "delete"
		}), yt(t);
	}
	function Ot(e) {
		if (!e) return 1;
		const t = Pe(Re(e, Se, "gridSpan"), "val"), r = t ? Number(t) : 1;
		return Number.isFinite(r) && r > 1 ? Math.floor(r) : 1;
	}
	function Lt(e) {
		if (!e) return;
		const t = Re(e, Se, "vMerge");
		return t ? "restart" === Pe(t, "val") ? "restart" : "continue" : void 0;
	}
	function Bt(e) {
		if (!e) return;
		const t = Re(e, Se, "hMerge");
		return t ? "restart" === Pe(t, "val") ? "restart" : "continue" : void 0;
	}
	function Ut(e, t, r) {
		if (!e) {
			if (!t) return;
			return yt({
				paddingTop: t.top,
				paddingRight: t.right,
				paddingBottom: t.bottom,
				paddingLeft: t.left,
				paddingStart: t.start,
				paddingEnd: t.end
			});
		}
		const n = {
			...void 0 !== t?.top ? { paddingTop: t.top } : {},
			...void 0 !== t?.right ? { paddingRight: t.right } : {},
			...void 0 !== t?.bottom ? { paddingBottom: t.bottom } : {},
			...void 0 !== t?.left ? { paddingLeft: t.left } : {},
			...void 0 !== t?.start ? { paddingStart: t.start } : {},
			...void 0 !== t?.end ? { paddingEnd: t.end } : {}
		}, o = Et(Re(e, Se, "shd"), r);
		o && (n.shading = o);
		const i = Re(e, Se, "tcW"), a = Pe(i, "type"), s = Pe(i, "w");
		if ("dxa" === a) {
			const e = Ke(s);
			void 0 !== e && (n.width = e);
		} else if ("pct" === a && s) {
			const e = Number(s);
			Number.isFinite(e) && (n.width = `${Ye(e / 50, 4)}%`);
		}
		const l = Pt(Re(e, Se, "tcMar"));
		l && (void 0 !== l.top && (n.paddingTop = l.top), void 0 !== l.bottom && (n.paddingBottom = l.bottom), void 0 !== l.left && (n.paddingLeft = l.left), void 0 !== l.right && (n.paddingRight = l.right), void 0 !== l.start && (n.paddingStart = l.start), void 0 !== l.end && (n.paddingEnd = l.end));
		const c = function(e) {
			if (!e) return;
			const t = Pe(Re(e, Se, "vAlign"), "val");
			return "top" === t || "bottom" === t ? t : "center" === t ? "middle" : void 0;
		}(e);
		c && (n.verticalAlign = c);
		const u = Ce(Pe(Re(e, Se, "textDirection"), "val"));
		u && (n.textDirection = u);
		const d = Le(e, "noWrap");
		void 0 !== d && (n.noWrap = d);
		const p = Le(e, "tcFitText");
		void 0 !== p && (n.fitText = p);
		const f = Le(e, "hideMark");
		void 0 !== f && (n.hideMark = f);
		const h = Pe(Re(e, Se, "headers"), "val");
		h && (n.headers = h);
		const m = Re(e, Se, "tcPrChange"), g = Re(m, Se, "tcPr");
		m && g && (n.propertyRevision = {
			...$t(m),
			type: "property",
			previous: Ut(g, void 0, r) ?? {}
		});
		const w = Re(e, Se, "cellIns"), b = Re(e, Se, "cellDel"), v = Re(e, Se, "cellMerge"), y = w ?? b ?? v;
		if (y) {
			const e = function(e) {
				return "rest" === e || "restart" === e ? "restart" : "cont" === e || "continue" === e ? "continue" : void 0;
			}(Pe(y, "vMergeOrig"));
			n.revision = {
				...$t(y),
				type: w ? "insert" : b ? "delete" : "merge",
				...v && e ? { previous: { vMerge: e } } : {}
			};
		}
		for (const [x, E] of Object.entries(function(e) {
			return e ? bt(Re(e, Se, "tcBorders")) : {};
		}(e))) E && (n[x] = E);
		return yt(n);
	}
	function zt(e) {
		const t = Re(e, Se, "trPr");
		return !!t && !0 === Le(t, "tblHeader");
	}
	function Ht(e) {
		if (!e) return;
		const t = ie(e, O), r = ie(void 0, O);
		return vt({
			styleId: e.styleId,
			align: t.align !== r.align ? t.align : void 0,
			spacingBefore: t.spacingBefore !== r.spacingBefore ? t.spacingBefore : void 0,
			spacingAfter: t.spacingAfter !== r.spacingAfter ? t.spacingAfter : void 0,
			contextualSpacing: void 0 !== e.contextualSpacing || t.contextualSpacing !== r.contextualSpacing ? t.contextualSpacing : void 0,
			lineHeight: t.lineHeight !== r.lineHeight ? t.lineHeight : void 0,
			lineRule: t.lineRule ?? void 0,
			lineGridPitch: e.lineGridPitch ?? void 0,
			snapToGrid: void 0 !== e.snapToGrid || t.snapToGrid !== r.snapToGrid ? t.snapToGrid : void 0,
			indentLeft: void 0 !== e.indentLeft || t.indentLeft !== r.indentLeft ? t.indentLeft : void 0,
			indentRight: void 0 !== e.indentRight || t.indentRight !== r.indentRight ? t.indentRight : void 0,
			indentFirstLine: void 0 !== e.indentFirstLine || t.indentFirstLine !== r.indentFirstLine ? t.indentFirstLine : void 0,
			indentHanging: void 0 !== e.indentHanging || t.indentHanging !== r.indentHanging ? t.indentHanging : void 0,
			mirrorIndents: void 0 !== e.mirrorIndents || t.mirrorIndents !== r.mirrorIndents ? t.mirrorIndents : void 0,
			pageBreakBefore: void 0 !== e.pageBreakBefore || t.pageBreakBefore !== r.pageBreakBefore ? t.pageBreakBefore : void 0,
			keepWithNext: void 0 !== e.keepWithNext || t.keepWithNext !== r.keepWithNext ? t.keepWithNext : void 0,
			keepLinesTogether: void 0 !== e.keepLinesTogether || t.keepLinesTogether !== r.keepLinesTogether ? t.keepLinesTogether : void 0,
			widowControl: void 0 !== e.widowControl || t.widowControl !== r.widowControl ? t.widowControl : void 0,
			shading: e.shading ?? void 0,
			borderTop: e.borderTop ?? void 0,
			borderRight: e.borderRight ?? void 0,
			borderBottom: e.borderBottom ?? void 0,
			borderLeft: e.borderLeft ?? void 0,
			tabs: e.tabs ?? void 0,
			textDirection: e.textDirection ?? void 0,
			outlineLevel: e.outlineLevel ?? void 0,
			suppressLineNumbers: void 0 !== e.suppressLineNumbers || t.suppressLineNumbers !== r.suppressLineNumbers ? t.suppressLineNumbers : void 0,
			suppressAutoHyphens: void 0 !== e.suppressAutoHyphens || t.suppressAutoHyphens !== r.suppressAutoHyphens ? t.suppressAutoHyphens : void 0,
			bidi: void 0 !== e.bidi || t.bidi !== r.bidi ? t.bidi : void 0,
			kinsoku: void 0 !== e.kinsoku || t.kinsoku !== r.kinsoku ? t.kinsoku : void 0,
			wordWrap: void 0 !== e.wordWrap || t.wordWrap !== r.wordWrap ? t.wordWrap : void 0,
			overflowPunct: void 0 !== e.overflowPunct || t.overflowPunct !== r.overflowPunct ? t.overflowPunct : void 0,
			topLinePunct: void 0 !== e.topLinePunct || t.topLinePunct !== r.topLinePunct ? t.topLinePunct : void 0,
			autoSpaceDE: void 0 !== e.autoSpaceDE || t.autoSpaceDE !== r.autoSpaceDE ? t.autoSpaceDE : void 0,
			autoSpaceDN: void 0 !== e.autoSpaceDN || t.autoSpaceDN !== r.autoSpaceDN ? t.autoSpaceDN : void 0,
			adjustRightInd: void 0 !== e.adjustRightInd || t.adjustRightInd !== r.adjustRightInd ? t.adjustRightInd : void 0,
			textAlignment: e.textAlignment ?? void 0,
			textboxTightWrap: e.textboxTightWrap ?? void 0,
			divId: e.divId ?? void 0,
			conditionalStyle: e.conditionalStyle ?? void 0,
			borderBetween: e.borderBetween ?? void 0,
			borderBar: e.borderBar ?? void 0,
			framePrXml: e.framePrXml ?? void 0,
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: Ht(e.propertyRevision.previous) ?? {}
			} : void 0
		});
	}
	function jt(e) {
		return void 0 !== e?.lineHeight ? e : {
			...e ?? {},
			lineHeight: 1.1
		};
	}
	function qt(e, t) {
		if (!e) return;
		const r = {}, n = Be(e, "pStyle");
		n && (r.styleId = n);
		const o = Pe(Re(e, Se, "jc"), "val");
		"left" === o || "start" === o || "center" === o || "right" === o || "end" === o || "justify" === o ? r.align = "start" === o ? "left" : "end" === o ? "right" : o : "both" !== o && "distribute" !== o || (r.align = "justify");
		const i = Re(e, Se, "spacing"), a = Pe(i, "before"), s = Pe(i, "after"), l = Pe(i, "line"), c = Pe(i, "lineRule");
		a && (r.spacingBefore = Qe(a, 0)), s && (r.spacingAfter = Qe(s, 0)), l && ("exact" === c || "atLeast" === c ? (r.lineHeight = Ye(Number(l) / 1440 * 96, 4), r.lineRule = c) : r.lineHeight = Number(l) / 240);
		const u = Le(e, "contextualSpacing");
		void 0 !== u && (r.contextualSpacing = u);
		const d = Le(e, "snapToGrid");
		void 0 !== d && (r.snapToGrid = d);
		const p = Re(e, Se, "ind"), f = Pe(p, "start") ?? Pe(p, "left"), h = Pe(p, "end") ?? Pe(p, "right"), m = Pe(p, "firstLine"), g = Pe(p, "hanging");
		f && (r.indentLeft = Qe(f, 0)), h && (r.indentRight = Qe(h, 0)), g ? (r.indentHanging = Qe(g, 0), r.indentFirstLine = void 0) : m && (r.indentFirstLine = Qe(m, 0));
		const w = function(e) {
			const t = Re(e, Se, "tabs");
			if (!t) return [];
			const r = [];
			for (const n of Ie(t, Se, "tab")) {
				const e = Ke(Pe(n, "pos"));
				if (void 0 === e) continue;
				const t = Pe(n, "val"), o = "center" === t || "right" === t || "decimal" === t || "bar" === t || "clear" === t ? t : "left", i = Pe(n, "leader"), a = "dot" === i || "hyphen" === i || "underscore" === i || "heavy" === i || "middleDot" === i ? i : "none" === i ? "none" : void 0;
				r.push({
					position: e,
					type: o,
					...void 0 !== a ? { leader: a } : {}
				});
			}
			return r;
		}(e);
		w.length > 0 && (r.tabs = w);
		const v = Le(e, "pageBreakBefore");
		void 0 !== v && (r.pageBreakBefore = v);
		const y = Le(e, "keepNext");
		void 0 !== y && (r.keepWithNext = y);
		const x = Le(e, "keepLines");
		void 0 !== x && (r.keepLinesTogether = x);
		const E = Le(e, "widowControl");
		void 0 !== E && (r.widowControl = E);
		const S = Le(e, "mirrorIndents");
		void 0 !== S && (r.mirrorIndents = S);
		const N = Re(e, Se, "pBdr");
		if (N) {
			const { borderTop: e, borderRight: t, borderBottom: n, borderLeft: o, borderBetween: i, borderBar: a } = bt(N);
			e && (r.borderTop = e), t && (r.borderRight = t), n && (r.borderBottom = n), o && (r.borderLeft = o), i && (r.borderBetween = i), a && (r.borderBar = a);
		}
		const k = Et(Re(e, Se, "shd"), t);
		k && (r.shading = k);
		const _ = Ce(Pe(Re(e, Se, "textDirection"), "val"));
		_ && (r.textDirection = _);
		const T = Pe(Re(e, Se, "outlineLvl"), "val");
		if (void 0 !== T) {
			const e = Number(T);
			Number.isFinite(e) && e >= 0 && e <= 8 && (r.outlineLevel = e);
		}
		const I = Le(e, "suppressLineNumbers");
		void 0 !== I && (r.suppressLineNumbers = I);
		const A = Le(e, "suppressAutoHyphens");
		void 0 !== A && (r.suppressAutoHyphens = A);
		const C = Le(e, "bidi");
		void 0 !== C && (r.bidi = C);
		const R = Le(e, "kinsoku");
		void 0 !== R && (r.kinsoku = R);
		const $ = Le(e, "wordWrap");
		void 0 !== $ && (r.wordWrap = $);
		const D = Le(e, "overflowPunct");
		void 0 !== D && (r.overflowPunct = D);
		const P = Le(e, "topLinePunct");
		void 0 !== P && (r.topLinePunct = P);
		const F = Le(e, "autoSpaceDE");
		void 0 !== F && (r.autoSpaceDE = F);
		const M = Le(e, "autoSpaceDN");
		void 0 !== M && (r.autoSpaceDN = M);
		const O = Le(e, "adjustRightInd");
		void 0 !== O && (r.adjustRightInd = O);
		const L = Pe(Re(e, Se, "textAlignment"), "val");
		"auto" !== L && "top" !== L && "center" !== L && "baseline" !== L && "bottom" !== L || (r.textAlignment = L);
		const B = Pe(Re(e, Se, "textboxTightWrap"), "val");
		"none" !== B && "allLines" !== B && "firstLineOnly" !== B && "firstLastLine" !== B || (r.textboxTightWrap = B);
		const U = Pe(Re(e, Se, "divId"), "val");
		if (null !== U) {
			const e = Number(U);
			Number.isFinite(e) && e >= 0 && (r.divId = Math.floor(e));
		}
		const z = Rt(e);
		z && (r.conditionalStyle = z);
		const H = Re(e, Se, "framePr");
		if (H) {
			const e = Pe(H, "dropCap");
			e && "none" !== e || (r.framePrXml = new b.XMLSerializer().serializeToString(H));
		}
		const j = Re(e, Se, "pPrChange"), q = dt(j), W = Re(j, Se, "pPr");
		return q && W && (r.propertyRevision = {
			...q,
			type: "property",
			previous: qt(W, t) ?? {}
		}), yt(r);
	}
	const Wt = {
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
	function Gt(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function Vt(e) {
		const t = Re(e, Se, "cols");
		if (!t) return;
		const r = Number.parseInt(Pe(t, "num") ?? "1", 10);
		if (!Number.isFinite(r) || r <= 1) return;
		const n = Qe(Pe(t, "space"), 0), o = Pe(t, "sep"), i = Pe(t, "equalWidth"), a = Ie(t, Se, "col").map((e) => ({
			width: Qe(Pe(e, "w"), 0),
			space: Qe(Pe(e, "space"), n)
		})), s = null == i || Gt(i);
		return {
			count: r,
			space: n,
			...Gt(o) ? { separator: !0 } : {},
			...s ? {} : { equalWidth: !1 },
			...!s && a.length > 0 ? { columns: a } : {}
		};
	}
	function Xt(e) {
		const t = Re(e, Se, "pgSz"), r = Re(e, Se, "pgMar"), n = Vt(e), i = Re(Re(e, Se, "pgBorders"), Se, "top"), a = Pe(i, "val"), s = Pe(i, "color"), l = Number.parseInt(Pe(i, "sz") ?? "0", 10), c = a && s && "nil" !== a ? {
			style: "double" === a || "dashed" === a || "dotted" === a ? a : "single",
			color: `#${s.replace(/^#/, "")}`,
			width: Number.isFinite(l) && l > 0 ? l / 8 : 1,
			distance: Number(Pe(i, "space") ?? 0)
		} : void 0;
		let u;
		if (t || r || n) {
			const e = Qe(Pe(t, "w"), 816), o = Qe(Pe(t, "h"), 1056), i = Pe(t, "orient");
			u = {
				width: e,
				height: o,
				orientation: "landscape" === i ? "landscape" : "portrait" === i ? "portrait" : e > o ? "landscape" : "portrait",
				margins: {
					top: Qe(Pe(r, "top"), 96),
					right: Qe(Pe(r, "right"), 96),
					bottom: Qe(Pe(r, "bottom"), 96),
					left: Qe(Pe(r, "left"), 96),
					header: Qe(Pe(r, "header"), 48),
					footer: Qe(Pe(r, "footer"), 48),
					gutter: Qe(Pe(r, "gutter"), 0)
				},
				...n ? { columns: n } : {}
			};
		}
		const d = (t) => {
			const r = {};
			for (const n of Ie(e, Se, t)) {
				const e = Pe(n, "type") ?? "default";
				if ("default" !== e && "first" !== e && "even" !== e) continue;
				const t = n.getAttribute("r:id") ?? n.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? null;
				t && (r[e] = t);
			}
			return r;
		}, p = d("headerReference"), f = d("footerReference"), h = Re(e, Se, "docGrid"), m = Pe(h, "type"), g = Qe(Pe(h, "linePitch"), NaN), w = Pe(Re(e, Se, "type"), "val"), b = "continuous" === w || "nextPage" === w || "evenPage" === w || "oddPage" === w || "nextColumn" === w ? w : void 0, v = Re(e, Se, "pgNumType");
		let y;
		if (v) {
			const e = Pe(v, "start"), t = null !== e ? Number.parseInt(e, 10) : void 0, r = Pe(v, "fmt") ?? void 0, n = Pe(v, "chapStyle") ?? void 0, o = Pe(v, "chapSep") ?? void 0;
			(void 0 !== t && Number.isFinite(t) || r || n || o) && (y = {
				...void 0 !== t && Number.isFinite(t) ? { start: t } : {},
				...r ? { format: r } : {},
				...n ? { chapterStyle: n } : {},
				...o ? { chapterSeparator: o } : {}
			});
		}
		const x = Pe(Re(e, Se, "vAlign"), "val"), E = "center" === x || "both" === x || "bottom" === x ? x : void 0, S = Le(e, "bidi"), N = Re(e, Se, "sectPrChange"), k = dt(N), _ = Re(N, Se, "sectPr"), T = k && _ ? {
			...k,
			type: "property",
			previous: (I = Xt(_), A = u, {
				pageSettings: I.pageSettings ?? A ?? Wt,
				...I.pageBorder ? { pageBorder: I.pageBorder } : {},
				...I.pageNumbering ? { pageNumbering: I.pageNumbering } : {},
				...I.verticalAlignment ? { verticalAlignment: I.verticalAlignment } : {},
				...void 0 !== I.bidi ? { bidi: I.bidi } : {},
				...I.breakType ? { nextBreakType: I.breakType } : {}
			})
		} : void 0;
		var I, A;
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
			verticalAlignment: E,
			bidi: S,
			propertyRevision: T
		};
	}
	function Zt(e) {
		if (!e) return;
		const t = Re(e, Se, "sectPr");
		if (!t) return;
		const r = Re(t, Se, "pgSz"), n = Re(t, Se, "pgMar"), o = Vt(t);
		if (!r && !n && !o) return;
		const i = Qe(Pe(r, "w"), 816), a = Qe(Pe(r, "h"), 1056), s = Pe(r, "orient");
		return {
			width: i,
			height: a,
			orientation: "landscape" === s ? "landscape" : "portrait" === s ? "portrait" : i > a ? "landscape" : "portrait",
			margins: {
				top: Qe(Pe(n, "top"), 96),
				right: Qe(Pe(n, "right"), 96),
				bottom: Qe(Pe(n, "bottom"), 96),
				left: Qe(Pe(n, "left"), 96),
				header: Qe(Pe(n, "header"), 48),
				footer: Qe(Pe(n, "footer"), 48),
				gutter: Qe(Pe(n, "gutter"), 0)
			},
			...o ? { columns: o } : {}
		};
	}
	function Yt(e, t, r, n, o) {
		if (t && r) for (const i of e) {
			if ("paragraph" === i.type) {
				const e = i.style?.styleId && /heading/i.test(i.style.styleId);
				void 0 !== i.style?.lineHeight || !1 === i.style?.snapToGrid || e || (i.style = {
					...i.style ?? {},
					lineGridPitch: t,
					lineGridType: n
				});
				continue;
			}
			if (o.adjustLineHeightInTable) for (const e of i.rows) for (const i of e.cells) Yt(i.blocks, t, r, n, o);
		}
	}
	const Qt = [
		{
			id: "decimal",
			label: "1, 2, 3, …"
		},
		{
			id: "roman",
			label: "i, ii, iii, …"
		},
		{
			id: "ROMAN",
			label: "I, II, III, …"
		},
		{
			id: "alphabetic",
			label: "a, b, c, …"
		},
		{
			id: "ALPHABETIC",
			label: "A, B, C, …"
		},
		{
			id: "Ordinal",
			label: "1st, 2nd, 3rd, …"
		}
	];
	function Kt(e) {
		if (e) return Qt.find((t) => t.id === e)?.id;
	}
	const Jt = new b.XMLSerializer();
	function er(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType !== o.ELEMENT_NODE || "http://schemas.openxmlformats.org/officeDocument/2006/math" !== o.namespaceURI || t && o.localName !== t || r.push(o);
		}
		return r;
	}
	function tr(e, t) {
		return er(e, t)[0];
	}
	function rr(e, t) {
		return e?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/math", t) ?? e?.getAttribute(`m:${t}`) ?? e?.getAttribute(t) ?? void 0;
	}
	function nr(e) {
		return e ? er(e).map(or) : [];
	}
	function or(e) {
		switch (e.localName) {
			case "r": return function(e) {
				const t = tr(e, "t")?.textContent ?? "", r = tr(e, "rPr"), n = r ? {
					...tr(r, "sty") ? { script: rr(tr(r, "sty"), "val") } : {},
					...tr(r, "nor") ? { normalText: !0 } : {},
					...tr(r, "b") ? { bold: "0" !== rr(tr(r, "b"), "val") } : {},
					...tr(r, "i") ? { italic: "0" !== rr(tr(r, "i"), "val") } : {}
				} : void 0;
				return {
					kind: "text",
					value: t,
					...n && Object.keys(n).length > 0 ? { style: n } : {}
				};
			}(e);
			case "f": return {
				kind: "fraction",
				numerator: nr(tr(e, "num")),
				denominator: nr(tr(e, "den"))
			};
			case "rad": return {
				kind: "radical",
				radicand: nr(tr(e, "e")),
				...tr(e, "deg") ? { degree: nr(tr(e, "deg")) } : {}
			};
			case "sSub":
			case "sSup":
			case "sSubSup": return function(e, t) {
				const r = nr(tr(e, "e")), n = nr(tr(e, "sub")), o = nr(tr(e, "sup"));
				return {
					kind: t,
					base: r,
					...n.length > 0 ? { subscript: n } : {},
					...o.length > 0 ? { superscript: o } : {}
				};
			}(e, "script");
			case "d": {
				const t = tr(e, "dPr");
				return {
					kind: "delimiter",
					children: er(e, "e").map(nr),
					...rr(tr(t, "begChr"), "val") ? { begin: rr(tr(t, "begChr"), "val") } : {},
					...rr(tr(t, "endChr"), "val") ? { end: rr(tr(t, "endChr"), "val") } : {},
					...rr(tr(t, "sepChr"), "val") ? { separator: rr(tr(t, "sepChr"), "val") } : {},
					grow: "0" !== rr(tr(t, "grow"), "val")
				};
			}
			case "acc": return {
				kind: "accent",
				accent: rr(tr(tr(e, "accPr"), "chr"), "val") ?? "¯",
				children: nr(tr(e, "e"))
			};
			case "nary": {
				const t = tr(e, "naryPr");
				return {
					kind: "nary",
					operator: rr(tr(t, "chr"), "val") ?? "∑",
					children: nr(tr(e, "e")),
					...er(e, "sub").length > 0 ? { subscript: nr(tr(e, "sub")) } : {},
					...er(e, "sup").length > 0 ? { superscript: nr(tr(e, "sup")) } : {},
					grow: "0" !== rr(tr(t, "grow"), "val")
				};
			}
			case "limLow": return {
				kind: "limit",
				operator: "low",
				base: nr(tr(e, "e")),
				limit: nr(tr(e, "lim"))
			};
			case "limUpp": return {
				kind: "limit",
				operator: "upper",
				base: nr(tr(e, "e")),
				limit: nr(tr(e, "lim"))
			};
			case "m": return {
				kind: "matrix",
				rows: er(e, "mr").map((e) => er(e, "e").map(nr))
			};
			case "box":
			case "borderBox": return {
				kind: "box",
				children: nr(tr(e, "e")),
				border: !0
			};
			case "phant": return {
				kind: "box",
				children: nr(tr(e, "e")),
				hidden: !0
			};
			case "groupChr": return {
				kind: "accent",
				accent: rr(tr(tr(e, "groupChrPr"), "chr"), "val") ?? "¯",
				children: nr(tr(e, "e"))
			};
			case "func": return {
				kind: "group",
				children: [...nr(tr(e, "fName")), ...nr(tr(e, "e"))]
			};
			default: return {
				kind: "raw",
				xml: Jt.serializeToString(e),
				fallbackText: e.textContent ?? ""
			};
		}
	}
	function ir(e) {
		const t = "oMathPara" === e.localName ? tr(e, "oMath") : e;
		return {
			version: 1,
			children: t ? er(t).map(or) : [],
			display: "oMathPara" === e.localName,
			sourceXml: Jt.serializeToString(e)
		};
	}
	const ar = /* @__PURE__ */ new Set([
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
	]), sr = /* @__PURE__ */ new Set(["repeatingSection", "repeatingSectionItem"]);
	function lr(e) {
		if (!e) return {};
		const t = {}, r = Re(e, Se, "alias");
		if (r) {
			const e = Pe(r, "val");
			null !== e && (t.alias = e);
		}
		const n = Re(e, Se, "tag");
		if (n) {
			const e = Pe(n, "val");
			null !== e && (t.tag = e);
		}
		const o = Re(e, Se, "id");
		if (o) {
			const e = Pe(o, "val");
			null !== e && (t.id = e);
		}
		const i = Re(e, Se, "lock");
		if (i) {
			const e = Pe(i, "val");
			null !== e && (t.lock = e);
		}
		const a = Re(e, Se, "appearance");
		if (a) {
			const e = Pe(a, "val");
			null !== e && (t.appearance = e);
		}
		const s = Re(e, Se, "showingPlcHdr");
		s && (t.showingPlcHdr = Oe(Pe(s, "val")));
		const l = Re(e, Se, "temporary");
		l && (t.temporary = Oe(Pe(l, "val")));
		const c = Re(e, Se, "color");
		if (c) {
			const e = Pe(c, "val");
			null !== e && (t.color = e);
		}
		const u = Re(e, Se, "placeholder");
		if (u) {
			const e = Re(u, Se, "docPart");
			if (e) {
				const r = Pe(e, "val");
				null !== r && (t.placeholderDocPart = r);
			}
		}
		const d = Re(e, Se, "dataBinding");
		if (d) {
			const e = function(e) {
				const t = {}, r = Pe(e, "prefixMappings"), n = Pe(e, "xpath"), o = Pe(e, "storeItemID");
				null !== r && (t.prefixMappings = r);
				null !== n && (t.xpath = n);
				null !== o && (t.storeItemID = o);
				if (void 0 === t.prefixMappings) {
					const r = Pe(Re(e, Se, "prefixMappings"), "val");
					null !== r && (t.prefixMappings = r);
				}
				if (void 0 === t.xpath) {
					const r = Pe(Re(e, Se, "xpath"), "val");
					null !== r && (t.xpath = r);
				}
				if (void 0 === t.storeItemID) {
					const r = Pe(Re(e, Se, "storeItemID"), "val");
					null !== r && (t.storeItemID = r);
				}
				return void 0 === t.prefixMappings && void 0 === t.xpath && void 0 === t.storeItemID ? null : t;
			}(d);
			e && (t.dataBinding = e);
		}
		const p = function(e) {
			const t = Re(e, Se, "comboBox");
			if (t) {
				const e = Re(t, Se, "lastSelectedValue");
				return {
					kind: "comboBox",
					listItems: cr(t),
					...e ? { lastSelectedValue: Pe(e, "val") ?? void 0 } : {}
				};
			}
			const r = Re(e, Se, "dropDownList");
			if (r) {
				const e = Re(r, Se, "lastSelectedValue");
				return {
					kind: "dropDownList",
					listItems: cr(r),
					...e ? { lastSelectedValue: Pe(e, "val") ?? void 0 } : {}
				};
			}
			const n = Re(e, Se, "date");
			if (n) {
				const e = Pe(n, "fullDate") ?? void 0, t = Re(n, Se, "dateFormat"), r = Re(n, Se, "lid"), o = Re(n, Se, "calendar"), i = Re(n, Se, "storeMappedDataAs");
				return {
					kind: "date",
					fullDate: e,
					dateFormat: t ? Pe(t, "val") ?? void 0 : void 0,
					lid: r ? Pe(r, "val") ?? void 0 : void 0,
					calendar: o ? Pe(o, "val") ?? void 0 : void 0,
					storeMappedDataAs: i ? Pe(i, "val") ?? void 0 : void 0
				};
			}
			if (Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "text")) return { kind: "text" };
			for (const i of [
				"richText",
				"picture",
				"group",
				"equation",
				"citation",
				"bibliography"
			]) if (Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", i)) return { kind: i };
			if (De(e, "repeatingSection") || Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection")) return { kind: "repeatingSection" };
			if (De(e, "repeatingSectionItem") || Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSectionItem")) return { kind: "repeatingSectionItem" };
			const o = $e(e, "checkbox");
			if (o) {
				const e = Re(o, ke, "checked"), t = Re(o, ke, "checkedState"), r = Re(o, ke, "uncheckedState"), n = e ? Oe(Pe(e, "val")) : void 0;
				return {
					kind: "checkbox",
					...void 0 !== n ? { checked: n } : {},
					...t ? {
						checkedStateFont: Pe(t, "font") ?? void 0,
						checkedStateChar: Pe(t, "char") ?? void 0
					} : {},
					...r ? {
						uncheckedStateFont: Pe(r, "font") ?? void 0,
						uncheckedStateChar: Pe(r, "char") ?? void 0
					} : {}
				};
			}
		}(e);
		if (p && (t.subtype = p, "repeatingSection" === p.kind)) {
			const r = De(e, "repeatingSection") ?? Re(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection");
			if (r) {
				const e = De(r, "sectionTitle"), n = De(r, "doNotAllowInsertDeleteSection"), o = {}, i = Pe(e, "val");
				if (null !== i && (o.sectionTitle = i), n) {
					const e = Pe(n, "val");
					o.doNotAllowInsertDeleteSection = null === e || Oe(e);
				}
				Object.keys(o).length > 0 && (t.repeatingSectionProperties = o);
			}
		}
		const f = function(e) {
			let t = "";
			for (let r = 0; r < e.childNodes.length; r += 1) {
				const n = e.childNodes[r];
				if (n?.nodeType !== n.ELEMENT_NODE) continue;
				const o = n, i = o.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && ar.has(o.localName), a = o.localName && "http://schemas.microsoft.com/office/word/2012/wordml" === o.namespaceURI && sr.has(o.localName);
				i || a || (t += new b.XMLSerializer().serializeToString(o));
			}
			return t;
		}(e);
		return f.length > 0 && (t.unknownXml = f), t;
	}
	function cr(e) {
		const t = Ie(e, Se, "listItem");
		if (0 !== t.length) return t.map((e) => ({
			displayText: Pe(e, "displayText") ?? void 0,
			value: Pe(e, "value") ?? void 0
		}));
	}
	const ur = new Set(Object.keys({
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
	function dr(e) {
		return e && ur.has(e) ? e : void 0;
	}
	const pr = {
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
	}, fr = /^[0-9a-fA-F]{6}$/;
	function hr(e) {
		return e.trim().replace(/^#/, "");
	}
	function mr(e) {
		if (!e) return null;
		const t = hr(e);
		return fr.test(t) ? t.toUpperCase() : null;
	}
	function gr(e) {
		const t = mr(e);
		if (t) return t;
		const r = e?.trim();
		if (!r) return null;
		const n = r.toLowerCase();
		if (Object.hasOwn(pr, n)) return pr[n];
		const o = r.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
		if (o) {
			const e = o.length <= 4 ? [...o].map((e) => e + e).join("") : o;
			return 8 === e.length && "ff" !== e.slice(6).toLowerCase() ? null : e.slice(0, 6).toUpperCase();
		}
		const i = r.match(/^rgba?\((.*)\)$/i)?.[1];
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
			const r = Number(t);
			return Number.isFinite(r) ? r : null;
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
		return c.some((e) => null === e) ? null : function(e, t, r) {
			const n = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
			return `#${n(e)}${n(t)}${n(r)}`;
		}(c[0], c[1], c[2]).slice(1).toUpperCase();
	}
	function wr(e) {
		const t = br(e);
		return void 0 === t ? void 0 : Math.round(t / I);
	}
	function br(e) {
		if (null == e || "" === e) return;
		const t = parseInt(e, 10);
		return Number.isFinite(t) ? t : void 0;
	}
	function vr(e) {
		const t = e?.trim();
		if (!t) return null;
		const r = t.match(/^(-?\d+(?:\.\d+)?)(pt|px|in|cm|mm|pc)?$/i);
		if (!r) return null;
		const n = Number(r[1]);
		if (!Number.isFinite(n) || n <= 0) return null;
		switch ((r[2] ?? "px").toLowerCase()) {
			case "pt": return Math.round(n * T);
			case "in": return Math.round(96 * n);
			case "cm": return Math.round(n / 2.54 * 96);
			case "mm": return Math.round(n / 25.4 * 96);
			case "pc": return Math.round(12 * n * T);
			default: return Math.round(n);
		}
	}
	function yr(e) {
		const t = mr(e);
		return t ? `#${t}` : void 0;
	}
	function xr(e) {
		for (let t = 0; t < e.childNodes.length; t += 1) {
			const r = e.childNodes[t];
			if (r?.nodeType !== r.ELEMENT_NODE) continue;
			const n = r;
			if ("inline" === n.localName || "anchor" === n.localName) return {
				element: n,
				kind: n.localName
			};
		}
	}
	function Er(e) {
		return "1" === e || "true" === e || "0" !== e && "false" !== e && void 0;
	}
	function Sr(e, t) {
		const r = Fe(e, t);
		if (!r) return;
		const n = Fe(r, "align")?.textContent?.trim(), o = Fe(r, "posOffset")?.textContent?.trim(), i = br(o), a = {
			relativeFrom: r.getAttribute("relativeFrom") ?? void 0,
			...n ? { align: n } : {},
			...void 0 !== i ? { offset: i } : {}
		};
		return void 0 !== a.relativeFrom || void 0 !== a.align || void 0 !== a.offset ? a : void 0;
	}
	function Nr(e) {
		const t = Sr(e, "positionH"), r = Sr(e, "positionV"), n = function(e) {
			return Fe(e, "wrapSquare") ? "square" : Fe(e, "wrapTight") ? "tight" : Fe(e, "wrapThrough") ? "through" : Fe(e, "wrapTopAndBottom") ? "topAndBottom" : Fe(e, "wrapNone") ? "none" : void 0;
		}(e), o = function(e) {
			const t = Fe(e, "wrapSquare") ?? Fe(e, "wrapTight") ?? Fe(e, "wrapThrough");
			if (!t) return;
			const r = t.getAttribute("wrapText");
			return !r || "bothSides" === r || "left" !== r && "right" !== r && "largest" !== r && "bothSides" !== r ? void 0 : r;
		}(e), i = br(e.getAttribute("distT")), a = br(e.getAttribute("distB")), s = br(e.getAttribute("distL")), l = br(e.getAttribute("distR")), c = Er(e.getAttribute("simplePos")), u = br(e.getAttribute("relativeHeight")), d = Er(e.getAttribute("behindDoc")), p = Er(e.getAttribute("locked")), f = Er(e.getAttribute("layoutInCell")), h = Er(e.getAttribute("allowOverlap"));
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
			...r ? { positionV: r } : {},
			...n ? { wrap: n } : {},
			...o ? { wrapText: o } : {}
		};
	}
	async function kr(e, t, r, n) {
		const o = Fe(e, "blip");
		if (!o) return {
			text: "",
			image: void 0
		};
		const { embed: i, link: a } = function(e) {
			const t = {};
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				n && ("embed" === n.localName || "r:embed" === n.name ? t.embed = n.value : "link" !== n.localName && "r:link" !== n.name || (t.link = n.value));
			}
			return t;
		}(o), s = xr(e), l = s?.element ?? e, c = Fe(l, "extent"), u = Fe(l, "docPr");
		let d = 300, p = 300;
		if (c) {
			const e = c.getAttribute("cx"), t = c.getAttribute("cy");
			e && (d = Math.round(parseInt(e, 10) / I)), t && (p = Math.round(parseInt(t, 10) / I));
		}
		const f = u ? Pe(u, "descr") ?? Pe(u, "title") : null, h = function(e) {
			const t = Fe(e, "srcRect");
			if (!t) return;
			const r = (e) => {
				const r = t.getAttribute(e);
				if (null === r || "" === r) return;
				const n = parseInt(r, 10);
				return Number.isFinite(n) && 0 !== n ? n / R : void 0;
			}, n = {
				left: r("l"),
				top: r("t"),
				right: r("r"),
				bottom: r("b")
			};
			return void 0 !== n.left || void 0 !== n.top || void 0 !== n.right || void 0 !== n.bottom ? n : void 0;
		}(e), m = function(e) {
			const t = Fe(e, "pic"), r = t && Fe(t, "spPr");
			if (!r) return;
			let n = null;
			for (let l = 0; l < r.childNodes.length; l += 1) {
				const e = r.childNodes[l];
				if (1 !== e?.nodeType) continue;
				const t = e;
				if ("prstGeom" === t.localName) {
					n = t;
					break;
				}
			}
			const o = n?.getAttribute("prst");
			if (!n || !o || "rect" === o) return;
			const i = {}, a = Array.from(n.childNodes).find((e) => 1 === e?.nodeType && "avLst" === e.localName);
			if (a) for (let l = 0; l < a.childNodes.length; l += 1) {
				const e = a.childNodes[l];
				if (1 !== e?.nodeType || "gd" !== e.localName) continue;
				const t = e, r = t.getAttribute("name"), n = (t.getAttribute("fmla") ?? "").match(/(-?\d+(?:\.\d+)?)\s*$/);
				r && n && (i[r] = Number(n[1]));
			}
			const s = {
				preset: o,
				rawXml: new b.XMLSerializer().serializeToString(n)
			};
			return Object.keys(i).length > 0 && (s.adjustments = i), s;
		}(e), g = function(e) {
			if (Fe(e, "tile")) return "tile";
		}(e), w = function(e) {
			const t = Fe(e, "pic"), r = t && Fe(t, "spPr");
			if (r) for (let n = 0; n < r.childNodes.length; n += 1) {
				const e = r.childNodes[n];
				if (1 !== e?.nodeType) continue;
				const t = e;
				if ("ln" !== t.localName) continue;
				const o = yr(Fe(t, "srgbClr")?.getAttribute("val"));
				if (!o) return;
				const i = { color: o }, a = br(t.getAttribute("w"));
				void 0 !== a && (i.widthPt = Ye(a / A, 2));
				const s = dr(Fe(t, "prstDash")?.getAttribute("val"));
				return s && (i.dash = s), i;
			}
		}(e), v = function(e) {
			const t = Fe(e, "alphaModFix");
			if (!t) return;
			const r = t.getAttribute("amt");
			if (null === r || "" === r) return;
			const n = parseInt(r, 10);
			return Number.isFinite(n) ? Math.round(1e3 * (1 - Math.max(0, Math.min(R, n)) / R)) / 1e3 : void 0;
		}(e), y = function(e) {
			const t = Fe(e, "xfrm");
			if (!t) return {};
			const r = {}, n = t.getAttribute("rot");
			if (n) {
				const e = parseInt(n, 10);
				Number.isFinite(e) && 0 !== e && (r.rotation = e / $);
			}
			const o = t.getAttribute("flipH");
			"1" !== o && "true" !== o || (r.flipH = !0);
			const i = t.getAttribute("flipV");
			return "1" !== i && "true" !== i || (r.flipV = !0), r;
		}(e), x = "anchor" === s?.kind ? Nr(s.element) : void 0, E = "anchor" === s?.kind ? function(e) {
			const t = Fe(e, "wrapPolygon");
			if (!t) return;
			const r = [];
			for (let n = 0; n < t.childNodes.length; n += 1) {
				const e = t.childNodes[n];
				if (1 !== e?.nodeType) continue;
				const o = e;
				if ("start" !== o.localName && "lineTo" !== o.localName) continue;
				const i = br(o.getAttribute("x")), a = br(o.getAttribute("y"));
				void 0 !== i && void 0 !== a && r.push({
					x: i / 21600,
					y: a / 21600
				});
			}
			if (r.length >= 2) {
				const e = r[0], t = r[r.length - 1];
				Math.abs(e.x - t.x) < 1e-6 && Math.abs(e.y - t.y) < 1e-6 && r.pop();
			}
			return r.length >= 3 ? r : void 0;
		}(s.element) : void 0, S = {
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
			...E ? { wrapPolygon: E } : {}
		}, N = i ? r.get(i) : void 0, k = a ? r.get(a) : void 0;
		if (k && function(e) {
			return /^[a-z][a-z0-9+.-]*:\/\//i.test(e) || e.startsWith("//");
		}(k)) return {
			text: "￼",
			image: {
				src: "",
				linkedSrc: k,
				...S
			}
		};
		const _ = N ?? k;
		if (_) {
			const e = await qe(t, n, _);
			if (e) return {
				text: "￼",
				image: {
					src: e,
					...S
				}
			};
		}
		return {
			text: "",
			image: void 0
		};
	}
	function _r(e) {
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
		const r = Number(t);
		return Number.isFinite(r) && 0 !== r ? r / 65536 : void 0;
	}
	async function Tr(e, t, r, n) {
		const o = Fe(e, "imagedata");
		if (!o) return;
		const i = function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const r = e.attributes[t];
				if (r && ("id" === r.localName || "r:id" === r.name)) return r.value;
			}
		}(o), a = i ? r.get(i) : void 0;
		if (!a) return;
		const s = function(e) {
			const t = {};
			if (!e) return t;
			for (const r of e.split(";")) {
				const e = r.indexOf(":");
				if (e < 0) continue;
				const n = r.slice(0, e).trim().toLowerCase(), o = r.slice(e + 1).trim();
				if ("width" === n) {
					const e = vr(o);
					null !== e && (t.width = e);
				} else if ("height" === n) {
					const e = vr(o);
					null !== e && (t.height = e);
				}
			}
			return t;
		}(Fe(e, "shape")?.getAttribute("style")), l = function(e) {
			const t = {
				left: _r(Pe(e, "cropleft")),
				top: _r(Pe(e, "croptop")),
				right: _r(Pe(e, "cropright")),
				bottom: _r(Pe(e, "cropbottom"))
			};
			if (void 0 !== t.left || void 0 !== t.top || void 0 !== t.right || void 0 !== t.bottom) return t;
		}(o), c = Pe(o, "title") ?? o.getAttribute("o:title"), u = await qe(t, n, a);
		return u ? {
			src: u,
			width: s.width ?? 300,
			height: s.height ?? 300,
			...c ? { alt: c } : {},
			...l ? { crop: l } : {}
		} : void 0;
	}
	async function Ir(e, t) {
		const r = Fe(e, "wsp");
		if (!r) return;
		const n = xr(e), o = n?.element ?? e, i = Fe(o, "extent"), a = wr(i?.getAttribute("cx")) ?? 300, s = wr(i?.getAttribute("cy")) ?? 300, l = Fe(o, "docPr"), c = l ? Pe(l, "name") : null, u = l ? Pe(l, "descr") ?? Pe(l, "title") : null, d = "anchor" === n?.kind ? Nr(n.element) : void 0, p = Fe(r, "txbxContent"), f = p && t ? await t(p) : [], h = function(e) {
			const t = Fe(e, "spPr");
			if (!t) return;
			const r = {}, n = Fe(t, "prstGeom")?.getAttribute("prst");
			n && (r.preset = n);
			for (let o = 0; o < t.childNodes.length; o += 1) {
				const e = t.childNodes[o];
				if (e?.nodeType !== e.ELEMENT_NODE) continue;
				const n = e;
				if ("solidFill" === n.localName) {
					const e = yr(Fe(n, "srgbClr")?.getAttribute("val"));
					e && (r.fill = e);
				} else if ("ln" === n.localName) {
					const e = br(n.getAttribute("w"));
					void 0 !== e && (r.borderWidthPt = Ye(e / A, 2));
					const t = yr(Fe(n, "srgbClr")?.getAttribute("val"));
					t && (r.borderColor = t);
				}
			}
			return Object.keys(r).length > 0 ? r : void 0;
		}(r), m = function(e) {
			const t = Fe(e, "bodyPr");
			if (!t) return;
			const r = {}, n = wr(t.getAttribute("lIns")), o = wr(t.getAttribute("tIns")), i = wr(t.getAttribute("rIns")), a = wr(t.getAttribute("bIns"));
			void 0 !== n && (r.paddingLeft = n), void 0 !== o && (r.paddingTop = o), void 0 !== i && (r.paddingRight = i), void 0 !== a && (r.paddingBottom = a);
			const s = t.getAttribute("anchor");
			s && (r.anchor = s);
			const l = t.getAttribute("wrap");
			l && (r.wrap = l);
			const c = t.getAttribute("vert");
			return "vert" !== c && "vert270" !== c && "wordArtVert" !== c || (r.vert = c), Fe(t, "spAutoFit") && (r.autoFit = !0), Object.keys(r).length > 0 ? r : void 0;
		}(r), g = function(e) {
			const t = Fe(e, "spPr");
			if (!t) return;
			const n = br(Fe(t, "xfrm")?.getAttribute("rot"));
			return void 0 !== n && 0 !== n && (Math.round(n / 6e4) % 360 + 360) % 360 || void 0;
		}(r);
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
	function Ar(e) {
		let t;
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			if (n?.nodeType !== n.ELEMENT_NODE) continue;
			const o = n;
			if ("Choice" !== o.localName) continue;
			const i = Fe(o, "drawing");
			if (!i) continue;
			void 0 === t && (t = i);
			const a = o.getAttribute("Requires") ?? "";
			if (/\bwps\b/.test(a)) return i;
		}
		return t;
	}
	function Cr(e) {
		const t = /\b(?:REF|PAGEREF)\s+([^\\]+?)(?:\s+\\|\s*$)/i.exec(e);
		if (!t) return;
		const r = t[1].replace(/^"|"$/g, "").trim();
		return r.length > 0 ? r : void 0;
	}
	function Rr(e) {
		const t = Pe(e, "id");
		if (!t) return;
		if ("bookmarkEnd" === e.localName) return {
			kind: "end",
			docxId: t
		};
		const r = Pe(e, "name") ?? void 0, n = Pe(e, "colFirst"), o = Pe(e, "colLast"), i = null !== n ? Number.parseInt(n, 10) : void 0, a = null !== o ? Number.parseInt(o, 10) : void 0;
		return {
			kind: "start",
			docxId: t,
			...void 0 !== r ? { name: r } : {},
			...void 0 === i || Number.isNaN(i) ? {} : { colFirst: i },
			...void 0 === a || Number.isNaN(a) ? {} : { colLast: a }
		};
	}
	function $r(e) {
		const t = Pe(e, "id");
		if (t) return {
			kind: "commentRangeEnd" === e.localName ? "end" : "start",
			docxId: t
		};
	}
	function Dr(e) {
		const t = new b.XMLSerializer().serializeToString(e);
		let r = 2166136261;
		for (let n = 0; n < t.length; n += 1) r ^= t.charCodeAt(n), r = Math.imul(r, 16777619);
		return `revision:${r >>> 0}`;
	}
	function Pr(e) {
		const t = e.localName;
		if ("ins" !== t && "del" !== t && "moveFrom" !== t && "moveTo" !== t) return;
		const r = Pe(e, "date"), n = r ? Date.parse(r) : NaN, o = "del" === t || "moveFrom" === t;
		return {
			id: Pe(e, "id") ?? Dr(e),
			type: o ? "delete" : "insert",
			author: Pe(e, "author") ?? "Unknown",
			date: Number.isFinite(n) ? n : 0,
			..."moveFrom" === t ? { move: "from" } : "moveTo" === t ? { move: "to" } : {}
		};
	}
	function Fr(e) {
		const t = /^move(From|To)Range(Start|End)$/.exec(e.localName ?? "");
		if (!t) return;
		const r = "From" === t[1] ? "from" : "to", n = "Start" === t[2] ? "start" : "end", o = Pe(e, "date"), i = o ? Date.parse(o) : NaN, a = Pe(e, "colFirst"), s = Pe(e, "colLast"), l = null !== a ? Number.parseInt(a, 10) : NaN, c = null !== s ? Number.parseInt(s, 10) : NaN, u = Pe(e, "name") ?? void 0, d = Pe(e, "author") ?? void 0, p = Pe(e, "displacedByCustomXml") ?? void 0;
		return {
			move: r,
			edge: n,
			id: Pe(e, "id") ?? Dr(e),
			...void 0 !== u ? { name: u } : {},
			...void 0 !== d ? { author: d } : {},
			...Number.isFinite(i) ? { date: i } : {},
			...Number.isFinite(l) ? { columnFirst: l } : {},
			...Number.isFinite(c) ? { columnLast: c } : {},
			...void 0 !== p ? { displacedByCustomXml: p } : {}
		};
	}
	async function Mr(e, t, r, n, o) {
		const i = [];
		let a, s, l, c = 0;
		const u = [], d = [], p = (e) => {
			i.push(e), c += e.length;
		}, f = e.childNodes;
		for (let h = 0; h < f.length; h += 1) {
			const e = f[h];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const i = e;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === i.namespaceURI) if ("t" === i.localName || "delText" === i.localName) p(i.textContent ?? "");
			else if ("tab" === i.localName) p("	");
			else if ("noBreakHyphen" === i.localName) p("‑");
			else if ("softHyphen" === i.localName) p("­");
			else if ("br" === i.localName) {
				const e = Pe(i, "type");
				p("page" === e ? "\f" : "column" === e ? "\v" : "\n");
			} else {
				if ("lastRenderedPageBreak" === i.localName) continue;
				if ("bookmarkStart" === i.localName || "bookmarkEnd" === i.localName) {
					const e = Rr(i);
					e && u.push({
						offset: c,
						marker: e
					});
					continue;
				}
				if ("commentRangeStart" === i.localName || "commentRangeEnd" === i.localName) {
					const e = $r(i);
					e && d.push({
						offset: c,
						marker: e
					});
					continue;
				}
				if ("proofErr" === i.localName || "commentReference" === i.localName || "permStart" === i.localName || "permEnd" === i.localName) continue;
				if ("cr" === i.localName) p("\n");
				else if ("drawing" === i.localName) {
					const e = await kr(i, t, r, n);
					if (e.image) p(e.text), a = e.image;
					else {
						const e = await Ir(i, o);
						e && (p("￼"), s = e);
					}
				} else if ("pict" === i.localName) {
					const e = await Tr(i, t, r, n);
					e && (p("￼"), a = e);
				} else if ("sym" === i.localName) {
					const e = Pe(i, "font") ?? "", t = Pe(i, "char") ?? "", r = parseInt(t, 16);
					p(Number.isFinite(r) && r > 0 ? String.fromCodePoint(r) : "?"), l = {
						font: e,
						char: t
					};
				}
			}
			else if ("AlternateContent" === i.localName) {
				const e = Ar(i);
				if (e) {
					const t = await Ir(e, o);
					t && (p("￼"), s = t);
				}
			}
		}
		return {
			text: i.join(""),
			image: a,
			...s ? { textBox: s } : {},
			...u.length > 0 ? { innerBookmarks: u } : {},
			...d.length > 0 ? { innerComments: d } : {},
			...l ? { sym: l } : {}
		};
	}
	async function Or(e, t, r, n, o, i, a, s) {
		const l = [], c = [], u = (e, t) => {
			const r = Pe(e, "fldCharType"), n = Pe(e, "fldLock"), o = Pe(e, "dirty"), i = "true" === n || "1" === n, a = "true" === o || "1" === o;
			if ("begin" === r) l.push({
				text: "",
				fieldChar: {
					kind: "begin",
					...i ? { fieldLock: !0 } : {},
					...a ? { dirty: !0 } : {}
				},
				...t ? { styles: t } : {}
			}), c.push({
				beginIndex: l.length - 1,
				instruction: "",
				...t ? { beginStyles: t } : {}
			});
			else if ("separate" === r) l.push({
				text: "",
				fieldChar: { kind: "separate" },
				...t ? { styles: t } : {}
			});
			else if ("end" === r) {
				l.push({
					text: "",
					fieldChar: { kind: "end" },
					...t ? { styles: t } : {}
				});
				const e = c.pop();
				e && ((e) => {
					const t = /\bNUMPAGES\b/i.test(e.instruction) ? "NUMPAGES" : /\bPAGE\b/i.test(e.instruction) ? "PAGE" : /\bDATE\b/i.test(e.instruction) ? "DATE" : /\bREF\b/i.test(e.instruction) ? "REF" : /\bPAGEREF\b/i.test(e.instruction) ? "PAGEREF" : null;
					if (!t) return;
					const r = Kt(/\*\s*([A-Za-z]+)/.exec(e.instruction)?.[1]), n = "DATE" === t ? /@\s*"([^"]*)"/.exec(e.instruction)?.[1] : void 0, o = "REF" === t || "PAGEREF" === t ? Cr(e.instruction) : void 0, i = l.slice(e.beginIndex);
					if (i.some((e) => e.bookmark)) return;
					const a = i.filter((e) => !e.fieldChar && void 0 === e.fieldInstruction), s = a.map((e) => e.text).join("") || "1", c = a.find((e) => e.styles)?.styles ?? e.beginStyles;
					l.length = e.beginIndex;
					const u = "DATE" === t ? n ? {
						type: "DATE",
						dateFormat: n
					} : { type: "DATE" } : "REF" === t || "PAGEREF" === t ? {
						type: t,
						bookmark: o
					} : r ? {
						type: t,
						format: r
					} : { type: t };
					l.push({
						text: s,
						...c ? { styles: c } : {},
						field: u
					});
				})(e);
			}
		}, d = (e, t) => {
			const r = e.textContent ?? "";
			l.push({
				text: "",
				fieldInstruction: r,
				...t ? { styles: t } : {}
			});
			const n = c[c.length - 1];
			n && (n.instruction += r);
		};
		for (let p = 0; p < e.childNodes.length; p += 1) {
			const c = e.childNodes[p];
			if (c?.nodeType !== c.ELEMENT_NODE) continue;
			const f = c;
			if ("http://schemas.openxmlformats.org/officeDocument/2006/math" === f.namespaceURI && ("oMath" === f.localName || "oMathPara" === f.localName)) {
				l.push({
					text: "￼",
					math: ir(f)
				});
				continue;
			}
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== f.namespaceURI) continue;
			if ("bookmarkStart" === f.localName || "bookmarkEnd" === f.localName) {
				const e = Rr(f);
				if (!e) continue;
				l.push({
					text: "",
					bookmark: e
				});
				continue;
			}
			if ("commentRangeStart" === f.localName || "commentRangeEnd" === f.localName) {
				const e = $r(f);
				if (!e) continue;
				l.push({
					text: "",
					comment: e
				});
				continue;
			}
			const h = Fr(f);
			if (h) {
				l.push({
					text: "",
					revisionRangeMarker: h
				});
				continue;
			}
			const m = Pr(f);
			if (m) {
				const e = await Or(f, t, r, n, o, i, a, s);
				for (const t of e) l.push({
					...t,
					revision: t.revision ?? m
				});
				continue;
			}
			if ("sdt" === f.localName) {
				const e = Re(f, Se, "sdtContent");
				if (!e) continue;
				const c = Re(f, Se, "sdtPr"), u = Re(f, Se, "sdtEndPr"), d = {
					groupId: v("sdt"),
					sdtPr: lr(c),
					...u ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(u) } : {}
				}, p = await Or(e, t, r, n, o, i, a, s);
				for (const t of p) l.push({
					...t,
					sdtWrappers: [d, ...t.sdtWrappers ?? []]
				});
				continue;
			}
			if ("r" === f.localName) {
				const e = _t(Re(f, Se, "rPr"), i);
				if (Ie(f, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "fldChar").length > 0 || Ie(f, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instrText").length > 0 || Ie(f, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "delInstrText").length > 0) {
					for (let t = 0; t < f.childNodes.length; t += 1) {
						const r = f.childNodes[t];
						if (r?.nodeType !== r.ELEMENT_NODE) continue;
						const n = r;
						"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && ("fldChar" === n.localName ? u(n, e) : "instrText" !== n.localName && "delInstrText" !== n.localName || d(n, e));
					}
					continue;
				}
				const t = Re(f, Se, "footnoteReference");
				if (t) {
					const r = Pe(t, "id");
					if (!r) continue;
					const n = Pe(t, "customMarkFollows");
					let o = e;
					(o ??= {}).styleId ??= "footnoteReference", void 0 === o.superscript && (o.superscript = !0), l.push({
						text: "?",
						styles: o,
						footnoteReference: {
							docxId: r,
							...n ? { customMark: n } : {}
						}
					});
					continue;
				}
				const c = Re(f, Se, "endnoteReference");
				if (c) {
					const t = Pe(c, "id");
					if (!t) continue;
					const r = Pe(c, "customMarkFollows");
					let n = e;
					(n ??= {}).styleId ??= "endnoteReference", void 0 === n.superscript && (n.superscript = !0), l.push({
						text: "?",
						styles: n,
						endnoteReference: {
							docxId: t,
							...r ? { customMark: r } : {}
						}
					});
					continue;
				}
				const { text: p, image: h, textBox: m, innerBookmarks: g, innerComments: w, sym: b } = await Mr(f, r, n, o, s);
				let v = e;
				b && !v?.fontFamily && ((v ??= {}).fontFamily = b.font), a && ((v ??= {}).link = a);
				const y = [...(g ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						bookmark: e.marker
					}
				})), ...(w ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						comment: e.marker
					}
				}))];
				if (y.length > 0 && !h && !m) {
					y.sort((e, t) => e.offset - t.offset);
					let e = 0;
					for (const r of y) {
						const t = p.slice(e, r.offset);
						t.length > 0 && l.push({
							text: t,
							...v ? { styles: v } : {}
						}), l.push(r.run), e = r.offset;
					}
					const t = p.slice(e);
					t.length > 0 && l.push({
						text: t,
						...v ? { styles: v } : {}
					});
					continue;
				}
				if (0 === p.length && !h && !m) continue;
				if (l.push({
					text: p,
					...h ? { image: h } : {},
					...m ? { textBox: m } : {},
					...b ? { sym: b } : {},
					...v ? { styles: v } : {}
				}), g) for (const r of g) l.push({
					text: "",
					bookmark: r.marker
				});
				continue;
			}
			if ("fldSimple" === f.localName) {
				const e = f.getAttribute("w:instr") ?? f.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instr") ?? f.getAttribute("instr") ?? "", c = /\bNUMPAGES\b/i.test(e) ? "NUMPAGES" : /\bPAGE\b/i.test(e) ? "PAGE" : /\bDATE\b/i.test(e) ? "DATE" : /\bREF\b/i.test(e) ? "REF" : /\bPAGEREF\b/i.test(e) ? "PAGEREF" : null, u = /\*\s*([A-Za-z]+)/.exec(e)?.[1], d = Kt(u), p = "DATE" === c ? /@\s*"([^"]*)"/.exec(e)?.[1] : void 0, h = "REF" === c || "PAGEREF" === c ? Cr(e) : void 0, m = await Or(f, t, r, n, o, i, a, s);
				if (c) {
					const e = m.map((e) => e.text).join("") || "1", t = m.find((e) => e.styles)?.styles, r = "DATE" === c ? p ? {
						type: "DATE",
						dateFormat: p
					} : { type: "DATE" } : "REF" === c || "PAGEREF" === c ? {
						type: c,
						bookmark: h
					} : d ? {
						type: c,
						format: d
					} : { type: c };
					l.push({
						text: e,
						styles: t,
						field: r
					});
				} else l.push({
					text: "",
					fieldChar: { kind: "begin" }
				}), l.push({
					text: "",
					fieldInstruction: e
				}), l.push({
					text: "",
					fieldChar: { kind: "separate" }
				}), l.push(...m), l.push({
					text: "",
					fieldChar: { kind: "end" }
				});
				continue;
			}
			if ("hyperlink" === f.localName) {
				let e = n.get(f.getAttribute("r:id") ?? f.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "") ?? null;
				if (!e) {
					const t = Pe(f, "anchor");
					t && (e = `#${t}`);
				}
				l.push(...await Or(f, t, r, n, o, i, e, s));
			}
		}
		return l;
	}
	const Lr = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Br = /<w:rPr(?:\s|\/|>)/, Ur = /<w:pPr(?:\s|\/|>)/;
	function zr(e) {
		if (Array.isArray(e)) return e.map(zr);
		if (!e || "object" != typeof e) return e;
		const t = e, r = function(e) {
			return "string" == typeof e.kind || "string" == typeof e.type || Array.isArray(e.runs) || Array.isArray(e.rows) || Array.isArray(e.cells) || Array.isArray(e.blocks);
		}(t), n = {};
		for (const [o, i] of Object.entries(t).sort(([e], [t]) => e.localeCompare(t))) void 0 === i || "id" === o && r || "ooxmlSource" === o || o.startsWith("__") || (n[o] = zr(i));
		return n;
	}
	function Hr(e) {
		return JSON.stringify(zr(e)) ?? "undefined";
	}
	function jr(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function qr(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType === o.ELEMENT_NODE && o.namespaceURI === Lr && o.localName === t && r.push(o);
		}
		return r;
	}
	function Wr(e, t) {
		return qr(e, t)[0];
	}
	function Gr(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : void 0;
	}
	function Vr(e) {
		return Hr(e);
	}
	function Xr(e) {
		return Hr({
			...e,
			text: void 0
		});
	}
	function Zr(e, t) {
		e.ooxmlSource = {
			xml: t,
			semanticSignature: Vr(e),
			structureSignature: Xr(e)
		};
	}
	function Yr(e) {
		return e.ooxmlSource;
	}
	function Qr(e) {
		return Hr(e);
	}
	function Kr(e) {
		return Hr({
			style: e.style,
			list: e.list,
			numberingRevision: e.numberingRevision
		});
	}
	function Jr(e) {
		return e.ooxmlSource;
	}
	function en(e) {
		return Hr(e);
	}
	function tn(e) {
		return Hr({ style: e.style });
	}
	function rn(e) {
		return Hr({
			gridCols: e.gridCols,
			gridRevision: e.gridRevision
		});
	}
	function nn(e) {
		return Hr({
			isHeader: e.isHeader,
			style: e.style,
			conditionalStyle: e.conditionalStyle
		});
	}
	function on(e) {
		return Hr({
			propertyExceptions: e.propertyExceptions,
			tblPrExChangeXml: e.tblPrExChangeXml
		});
	}
	function an(e) {
		return Hr({
			colSpan: e.colSpan,
			rowSpan: e.rowSpan,
			vMerge: e.vMerge,
			style: e.style,
			conditionalStyle: e.conditionalStyle,
			mergeRevisionState: e.mergeRevisionState
		});
	}
	function sn(e) {
		return e.ooxmlSource;
	}
	function ln(e, t) {
		const r = Gr(Wr(t, "tblPr")), n = Gr(Wr(t, "tblGrid")), o = qr(t, "tr");
		return o.length === e.rows.length && o.forEach((t, r) => {
			const n = e.rows[r];
			(function(e, t) {
				const r = {};
				t.rowPropertiesXml && (r.rowProperties = {
					xml: t.rowPropertiesXml,
					semanticSignature: nn(e)
				}), t.propertyExceptionsXml && (r.propertyExceptions = {
					xml: t.propertyExceptionsXml,
					semanticSignature: on(e)
				}), (r.rowProperties || r.propertyExceptions) && (e.ooxmlSource = r);
			})(n, {
				rowPropertiesXml: Gr(Wr(t, "trPr")),
				propertyExceptionsXml: Gr(Wr(t, "tblPrEx"))
			});
			const o = qr(t, "tc");
			o.length === n.cells.length && o.forEach((e, t) => {
				const r = Gr(Wr(e, "tcPr"));
				r && function(e, t) {
					e.ooxmlSource = { cellProperties: {
						xml: t,
						semanticSignature: an(e)
					} };
				}(n.cells[t], r);
			});
		}), {
			tablePropertiesXml: r,
			tableGridXml: n
		};
	}
	function cn(e) {
		return e.ooxmlSource;
	}
	function un(e, t, r) {
		const n = new b.XMLSerializer(), o = function(e, t) {
			const r = t.serializeToString(e.cloneNode(!1)), n = r.indexOf(">");
			if (n < 0) return;
			const o = r.slice(0, n + 1), i = e.tagName;
			return o.slice(`<${i}`.length, o.endsWith("/>") ? -2 : -1).trim() || void 0;
		}(e, n), i = t ? Re(t, Se, "sectPr") : null, a = i ? void 0 : n.serializeToString(e), s = t && !i ? n.serializeToString(t) : void 0, l = function(e, t) {
			const r = [], n = (e) => {
				for (let o = 0; o < e.childNodes.length; o += 1) {
					const i = e.childNodes[o];
					if (i?.nodeType !== i.ELEMENT_NODE) continue;
					const a = i;
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "r" !== a.localName ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "pPr" !== a.localName && "p" !== a.localName && "tbl" !== a.localName && "txbxContent" !== a.localName) && n(a) : r.push(t.serializeToString(a));
				}
			};
			return n(e), r;
		}(e, n), c = l.length === r.length ? l : void 0;
		if (a || o || s || c) return {
			...a ? { xml: a } : {},
			...o ? { attributes: o } : {},
			...s ? { paragraphPropertiesXml: s } : {},
			...c ? { runXml: c } : {}
		};
	}
	function dn(e) {
		const t = {
			id: v("run"),
			text: e.text
		};
		let r;
		e.styles && (t.styles = { ...e.styles }), e.revision && (t.revision = { ...e.revision }), e.revisionRangeMarker && (t.revisionRangeMarker = { ...e.revisionRangeMarker }), e.sdtWrappers?.length && (t.sdtWrappers = [...e.sdtWrappers]), r = e.fieldChar ? {
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
		const n = r;
		return e.footnoteReference && (n.__importedFootnoteRef = { ...e.footnoteReference }), e.endnoteReference && (n.__importedEndnoteRef = { ...e.endnoteReference }), e.bookmark && (n.__importedBookmark = { ...e.bookmark }), e.comment && (n.__importedComment = { ...e.comment }), n;
	}
	function pn(e, t, r, n, o, i) {
		const a = e.length > 0 ? e.map(dn) : [{
			id: v("run"),
			text: "",
			kind: "text",
			...o ? { styles: { ...o } } : {}
		}], s = {
			id: v("paragraph"),
			type: "paragraph",
			runs: a
		};
		s.style = t ? { ...t } : void 0;
		for (const l of s.runs) l.styles = kt(l.styles, s.style?.styleId);
		if (s.list = r ? { ...r } : void 0, s.numberingRevision = n ? { ...n } : void 0, i?.runXml?.length === s.runs.length) for (let l = 0; l < s.runs.length; l += 1) Zr(s.runs[l], i.runXml[l]);
		return i && function(e, t) {
			const r = {};
			t.xml && (r.xml = t.xml, r.semanticSignature = Qr(e)), t.attributes && (r.attributes = t.attributes), t.paragraphPropertiesXml && (r.paragraphProperties = {
				xml: t.paragraphPropertiesXml,
				semanticSignature: Kr(e)
			}), (r.xml || r.attributes || r.paragraphProperties) && (e.ooxmlSource = r);
		}(s, i), s;
	}
	function fn(e) {
		return e.some((e) => e.image || e.textBox || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.bookmark || e.comment || e.revisionRangeMarker || e.text.replace(/\s/g, "").length > 0);
	}
	async function hn(e, t, r, n, o, i, a, s) {
		const l = Re(e, Se, "pPr"), c = await Or(e, t, r, n, o, i, void 0, a), u = jt(qt(l, i.colors)), d = _t(Re(l, Se, "rPr"), i), p = function(e, t) {
			if (!e) return;
			const r = Re(e, Se, "numPr");
			if (!r) return;
			const n = Pe(Re(r, Se, "numId"), "val");
			if (!n) return;
			const o = Pe(Re(r, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "ilvl"), "val") ?? "0", i = Number.parseInt(o, 10), a = Number.isFinite(i) ? i : 0, s = gt(t, n, a), l = [];
			for (let m = 0; m <= a; m += 1) l[m] = gt(t, n, m).format ?? "decimal";
			const c = `${n}:${a}`, u = !t.seenInstances.has(c);
			t.seenInstances.add(c);
			const d = u ? t.numStartOverrides.get(c) ?? s.startAt : void 0, p = {
				kind: s.kind ?? "ordered",
				level: a,
				instanceId: n,
				suffix: s.suffix ?? "tab",
				...s.format ? { format: s.format } : {},
				...l.length ? { levelFormats: l } : {},
				...s.levelText ? { levelText: s.levelText } : {},
				...s.alignment ? { alignment: s.alignment } : {},
				...void 0 !== s.legal ? { legal: s.legal } : {},
				...void 0 !== d && 1 !== d ? { startAt: d } : {},
				...s.bulletGlyph ? { bulletGlyph: s.bulletGlyph } : {},
				...s.bulletFont ? { bulletFont: s.bulletFont } : {}
			}, f = ht(n, 1), h = ht(t.numToAbstractId.get(n), 0);
			return (void 0 !== f || void 0 !== h || s.rawFormat || void 0 !== s.restartAfterLevel || s.paragraphStyleId) && function(e, t) {
				e.ooxmlNumbering = {
					...t,
					importedFormat: e.format,
					importedKind: e.kind
				};
			}(p, {
				...void 0 !== f ? { sourceNumId: f } : {},
				...void 0 !== h ? { sourceAbstractNumId: h } : {},
				...s.rawFormat ? { format: s.rawFormat } : {},
				...void 0 !== s.restartAfterLevel ? { restartAfterLevel: s.restartAfterLevel } : {},
				...s.paragraphStyleId ? { paragraphStyleId: s.paragraphStyleId } : {}
			}), {
				list: p,
				indent: s.indent
			};
		}(l, t), f = p?.list, h = function(e) {
			if (!e) return;
			const r = Re(Re(e, Se, "numPr"), Se, "numberingChange"), n = dt(r);
			if (!n) return;
			const o = Pe(r, "original") ?? void 0;
			return {
				...n,
				...void 0 !== o ? { original: o } : {}
			};
		}(l);
		let m = u;
		if (p?.indent) {
			const { left: e, hanging: t } = p.indent, r = u ?? {};
			m = {
				...r,
				...void 0 === r.indentLeft && void 0 !== e ? { indentLeft: e } : {},
				...void 0 === r.indentHanging && void 0 !== t ? { indentHanging: t } : {}
			};
		}
		const g = Ht(s ? {
			...s,
			...m ?? {}
		} : m), w = function(e, t) {
			const r = Re(e, Se, "framePr");
			if (!r) return null;
			const n = Pe(r, "dropCap");
			if (!n || "none" === n) return null;
			const o = t.map((e) => e.text).join("");
			if (0 === o.length) return null;
			const i = Number(Pe(r, "lines"));
			return {
				text: o,
				lines: Number.isFinite(i) && i > 0 ? i : 3,
				type: "margin" === n ? "margin" : "drop",
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
			let r = !1;
			const n = (e, r) => {
				(0 !== r.length || e.image || e.textBox || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.bookmark || e.comment || e.revisionRangeMarker) && t[t.length - 1].push({
					...e,
					text: r
				});
			};
			for (const o of e) {
				if (!o.text.includes("\f")) {
					n(o, o.text);
					continue;
				}
				const e = o.text.split("\f");
				e.forEach((i, a) => {
					n(o, i), a < e.length - 1 && (r = !0, t.push([]));
				});
			}
			return {
				segments: t,
				hasPageBreak: r
			};
		}(c);
		if (!v) return {
			paragraphs: [pn(c, g, f, h, d, un(e, l, c))],
			pageBreakAfter: !1
		};
		const y = [];
		let x = !1;
		for (let E = 0; E < b.length; E += 1) {
			const e = b[E];
			if (E > 0 && (x = !0), !fn(e)) continue;
			const t = x ? {
				...g ?? {},
				pageBreakBefore: !0
			} : g;
			y.push(pn(e, t, f, h, d)), x = !1;
		}
		return {
			paragraphs: y,
			pageBreakAfter: x
		};
	}
	async function mn(e, t, r, n, o, i, a, s) {
		return (await hn(e, t, r, n, o, i, a, s)).paragraphs[0] ?? N([{ text: "" }]);
	}
	function gn(e, t, r, n) {
		for (const o of Ee(e)) {
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== o.namespaceURI) continue;
			if (o.localName === t) {
				n.push({
					element: o,
					...r.length > 0 ? { sdtWrappers: r } : {}
				});
				continue;
			}
			if ("sdt" !== o.localName) continue;
			const e = Re(o, Se, "sdtContent");
			if (!e) continue;
			const i = Re(o, Se, "sdtPr"), a = Re(o, Se, "sdtEndPr"), s = {
				groupId: v("sdt"),
				sdtPr: lr(i),
				...a ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(a) } : {}
			};
			gn(e, t, [...r, s], n);
		}
	}
	function wn(e, t) {
		const r = [];
		return gn(e, t, [], r), r;
	}
	function bn(e, t) {
		if (!t.every((e) => "paragraph" === e.type)) return;
		const r = Ie(e, Se, "p");
		r.length === t.length && function(e, t) {
			const r = (e) => e.style ??= {}, n = e.length - 1;
			for (let o = 0; o < e.length; o += 1) {
				const i = t[o];
				i && (0 === o && i.before && (r(e[o]).spacingBefore = 0), o === n && i.after && (r(e[o]).spacingAfter = 0));
			}
			for (let o = 0; o < n; o += 1) {
				if (!t[o]?.after || !t[o + 1]?.before) continue;
				const n = r(e[o]), i = r(e[o + 1]);
				(n.spacingAfter ?? 0) >= (i.spacingBefore ?? 0) ? i.spacingBefore = 0 : n.spacingAfter = 0;
			}
		}(t, r.map((e) => function(e) {
			const t = Re(e, Se, "spacing");
			return {
				before: Oe(Pe(t, "beforeAutospacing")),
				after: Oe(Pe(t, "afterAutospacing"))
			};
		}(Re(e, Se, "pPr"))));
	}
	function vn(e) {
		const t = e.style?.revision, r = "merge" === t?.type ? t.previous?.vMerge : void 0;
		if (!t || "merge" !== t.type || !r) return;
		const n = e.style ? {
			...e.style,
			revision: void 0
		} : void 0, o = {
			...e,
			blocks: "continue" === r ? [] : e.blocks,
			vMerge: r,
			rowSpan: void 0,
			style: n,
			mergeRevisionState: void 0
		};
		e.mergeRevisionState = {
			revisionId: t.id,
			orientation: "vertical",
			currentCellCount: 1,
			previousCells: [o]
		};
	}
	async function yn(e, t, r, n, o, i, a, s) {
		const l = [], c = Re(e, Se, "tblGrid");
		if (c) for (const b of Ie(c, Se, "gridCol")) {
			const e = Ke(Pe(b, "w"));
			void 0 !== e && l.push(e);
		}
		const u = Re(c, Se, "tblGridChange"), d = Re(e, Se, "tblPr"), p = Pe(Re(d, Se, "tblStyle"), "val"), f = Ft(d, p ?? void 0), h = function(e) {
			const t = Re(e, Se, "tblLook"), r = (e) => {
				const r = Pe(t, e);
				return null === r || "" === r ? void 0 : Oe(r);
			}, n = Pe(t, "val"), o = n ? Number.parseInt(n, 16) : NaN, i = (e) => Number.isFinite(o) ? 0 !== (o & e) : void 0;
			return {
				firstRow: r("firstRow") ?? i(32) ?? !0,
				lastRow: r("lastRow") ?? i(64) ?? !1,
				firstCol: r("firstColumn") ?? i(128) ?? !0,
				lastCol: r("lastColumn") ?? i(256) ?? !1,
				noHBand: r("noHBand") ?? i(512) ?? !1,
				noVBand: r("noVBand") ?? i(1024) ?? !1
			};
		}(d), m = wn(e, "tr"), g = [];
		for (let v = 0; v < m.length; v += 1) {
			const e = m[v], t = e.element, r = Re(t, Se, "trPr"), n = Rt(r), o = wn(t, "tc"), s = [];
			for (let p = 0; p < o.length; p += 1) {
				const e = o[p], t = e.element, r = Re(t, Se, "tcPr"), n = await a(t);
				bn(t, n);
				const l = Ot(r);
				if ("continue" === Bt(r) && s.length > 0) {
					const e = s[s.length - 1];
					e.colSpan = (e.colSpan ?? 1) + l;
					continue;
				}
				const c = Lt(r), u = Ut(r, void 0, i.colors), d = k(n.length > 0 ? n : [N([{ text: "" }])], l, "restart" === c ? {
					rowSpan: 1,
					vMerge: c
				} : c ? { vMerge: c } : void 0);
				u && (d.style = u), d.conditionalStyle = Rt(r), e.sdtWrappers?.length && (d.sdtWrappers = [...e.sdtWrappers]);
				const f = Me(t);
				f && (d.extAttributes = f), vn(d), "continue" === c && (d.blocks = []), s.push(d);
			}
			const l = _(s, zt(t) ? { isHeader: !0 } : void 0), c = Mt(r);
			c && (l.style = c), l.conditionalStyle = n, e.sdtWrappers?.length && (l.sdtWrappers = [...e.sdtWrappers]);
			const u = Me(t);
			u && (l.extAttributes = u);
			const d = Re(t, Se, "tblPrEx");
			if (d) {
				const e = Ft(d);
				e && (l.propertyExceptions = e);
				const t = Re(d, Se, "tblPrExChange");
				if (t) {
					const e = Dt(t);
					e && (l.propertyExceptionsRevision = e), l.tblPrExChangeXml = new b.XMLSerializer().serializeToString(t);
				}
			}
			g.push(l);
		}
		for (let b = 0; b < g.length; b += 1) {
			const e = g[b];
			for (let t = 0; t < e.cells.length; t += 1) {
				const r = e.cells[t];
				if ("restart" !== r.vMerge) continue;
				let n = 1;
				for (let e = b + 1; e < g.length; e += 1) {
					const r = g[e].cells[t];
					if (!r || "continue" !== r.vMerge) break;
					n += 1;
				}
				n > 1 && (r.rowSpan = n);
			}
		}
		const w = function(e, t) {
			return {
				id: v("table"),
				type: "table",
				rows: e,
				gridCols: t
			};
		}(g, l.length > 0 ? l : void 0);
		if (f && (w.style = f), w.style ? w.style.tblLook = h : p && (w.style = { tblLook: h }), u) {
			const e = Re(u, Se, "tblGrid"), t = e ? Ie(e, Se, "gridCol").map((e) => Ke(Pe(e, "w"))).filter((e) => void 0 !== e) : [], r = Pe(u, "date"), n = r ? Date.parse(r) : NaN;
			w.gridRevision = {
				id: Pe(u, "id") ?? "revision:grid",
				author: Pe(u, "author") ?? "Unknown",
				date: Number.isFinite(n) ? n : 0,
				type: "grid",
				previous: t
			};
		}
		return function(e, t) {
			let r = "string" == typeof t ? { xml: t } : t;
			if ("string" == typeof t) {
				const n = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
				n?.namespaceURI === Lr && "tbl" === n.localName && (r = {
					...r,
					...ln(e, n)
				});
			}
			const n = {
				xml: r.xml,
				semanticSignature: en(e)
			};
			r.tablePropertiesXml && (n.tableProperties = {
				xml: r.tablePropertiesXml,
				semanticSignature: tn(e)
			}), r.tableGridXml && (n.tableGrid = {
				xml: r.tableGridXml,
				semanticSignature: rn(e)
			}), e.ooxmlSource = n;
		}(w, new b.XMLSerializer().serializeToString(e)), w;
	}
	async function xn(e, t, r, n, o, i, a) {
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI ? [] : "p" === e.localName ? (await hn(e, t, r, n, o, i, a)).paragraphs : "tbl" === e.localName ? [await yn(e, 0, 0, 0, 0, i, a)] : "sdt" === e.localName ? En(e, t, r, n, o, i, a) : [];
	}
	async function En(e, t, r, n, o, i, a) {
		const s = Re(e, Se, "sdtPr"), l = Re(e, Se, "sdtEndPr"), c = {
			groupId: v("sdt"),
			sdtPr: lr(s),
			...l ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(l) } : {}
		}, u = Re(e, Se, "sdtContent"), d = [];
		if (u) for (let p = 0; p < u.childNodes.length; p += 1) {
			const e = u.childNodes[p];
			e?.nodeType === e.ELEMENT_NODE && d.push(...await xn(e, t, r, n, o, i, a));
		}
		for (const p of d) p.sdtWrappers = [c, ...p.sdtWrappers ?? []];
		return d;
	}
	function Sn(e, t, r, n, o) {
		return (i) => async function(e, t, r, n, o, i) {
			const a = Sn(t, r, n, o, i), s = [];
			for (let l = 0; l < e.childNodes.length; l += 1) {
				const c = e.childNodes[l];
				c?.nodeType === c.ELEMENT_NODE && s.push(...await xn(c, t, r, n, o, i, a));
			}
			return s;
		}(i, e, t, r, n, o);
	}
	async function Nn(e, t, r, n, o, i, a) {
		if (!e) return [];
		const s = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!s) return [];
		const l = Sn(t, r, n, o, i), c = [];
		for (let u = 0; u < s.childNodes.length; u += 1) {
			const e = s.childNodes[u];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const a = e;
			"p" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI ? c.push(await mn(a, t, r, n, o, i, l)) : "tbl" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI && c.push(await yn(a, 0, 0, 0, 0, i, l));
		}
		return c;
	}
	const kn = /* @__PURE__ */ new Set([
		"separator",
		"continuationSeparator",
		"continuationNotice"
	]);
	async function _n(e, t, r, n, o, i, a, s) {
		const l = {
			byDocxId: /* @__PURE__ */ new Map(),
			notes: { items: {} }
		};
		if (!t) return l;
		const c = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
		if (!c) return l;
		const u = {}, d = /* @__PURE__ */ new Map();
		let p, f;
		const h = Ie(c, Se, e);
		let m = 0;
		const g = Sn(r, n, o, i, a);
		for (const w of h) {
			const t = Pe(w, "id") ?? "", s = Pe(w, "type") ?? "", l = [];
			for (let e = 0; e < w.childNodes.length; e += 1) {
				const t = w.childNodes[e];
				if (t?.nodeType !== t.ELEMENT_NODE) continue;
				const s = t;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === s.namespaceURI && ("p" === s.localName ? l.push(await mn(s, r, n, o, i, a, g)) : "tbl" === s.localName && l.push(await yn(s, 0, 0, 0, 0, a, g)));
			}
			if (kn.has(s)) {
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
	function* Tn(e, t) {
		const r = se(e);
		for (const n of r) {
			const e = [
				n.header ?? [],
				n.firstPageHeader ?? [],
				n.evenPageHeader ?? [],
				n.blocks,
				n.footer ?? [],
				n.firstPageFooter ?? [],
				n.evenPageFooter ?? []
			];
			for (const r of e) for (const e of r) for (const r of ce(e)) for (const e of r.runs) e.kind === t && (yield {
				paragraph: r,
				run: e
			});
		}
	}
	function In(e, t, r) {
		if (!e) return {
			blocks: e,
			changed: !1
		};
		let n = !1;
		const o = e.map((e) => {
			switch (e.type) {
				case "paragraph": {
					const o = function(e, t, r) {
						let n = !1;
						const o = e.runs.map((e) => {
							const o = t.getRef(e);
							if (!o) return e;
							const i = r.get(o.id);
							return void 0 === i || e.text === i ? e : (n = !0, {
								...e,
								text: i
							});
						});
						return n ? {
							...e,
							runs: o
						} : e;
					}(e, t, r);
					return o !== e && (n = !0), o;
				}
				case "table": {
					let o = !1;
					const i = e.rows.map((e) => {
						let n = !1;
						const i = e.cells.map((e) => {
							const o = In(e.blocks, t, r);
							return o.changed && o.blocks ? (n = !0, {
								...e,
								blocks: o.blocks
							}) : e;
						});
						return n ? (o = !0, {
							...e,
							cells: i
						}) : e;
					});
					return o ? (n = !0, {
						...e,
						rows: i
					}) : e;
				}
				default: return L(e, "block");
			}
		});
		return {
			blocks: n ? o : e,
			changed: n
		};
	}
	function An(e, t, r) {
		const n = t.settings?.numberFormat ?? "decimal", o = t.settings?.startAt ?? 1, i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
		let s = o - 1;
		for (const { run: p } of Tn(e, r.runKind)) {
			const e = r.getRef(p);
			e && (i.add(e.id), e.customMark ? a.set(e.id, e.customMark) : a.has(e.id) || (s += 1, a.set(e.id, r.formatMarker(s, n))));
		}
		let l = !1;
		const c = se(e).map((e) => {
			const t = In(e.blocks, r, a), n = In(e.header, r, a), o = In(e.firstPageHeader, r, a), i = In(e.evenPageHeader, r, a), s = In(e.footer, r, a), c = In(e.firstPageFooter, r, a), u = In(e.evenPageFooter, r, a);
			return t.changed || n.changed || o.changed || i.changed || s.changed || c.changed || u.changed ? (l = !0, {
				...e,
				blocks: t.blocks ?? e.blocks,
				header: n.blocks,
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
	const Cn = [
		[1e3, "m"],
		[900, "cm"],
		[500, "d"],
		[400, "cd"],
		[100, "c"],
		[90, "xc"],
		[50, "l"],
		[40, "xl"],
		[10, "x"],
		[9, "ix"],
		[5, "v"],
		[4, "iv"],
		[1, "i"]
	];
	function Rn(e) {
		if (e <= 0) return String(e);
		let t = e, r = "";
		for (const [n, o] of Cn) for (; t >= n;) r += o, t -= n;
		return r;
	}
	function $n(e) {
		if (e <= 0) return String(e);
		let t = e, r = "";
		for (; t > 0;) r = "abcdefghijklmnopqrstuvwxyz"[(t - 1) % 26] + r, t = Math.floor((t - 1) / 26);
		return r;
	}
	const Dn = [
		"*",
		"†",
		"‡",
		"§",
		"¶",
		"#"
	];
	function Pn(e, t = "decimal") {
		switch (t) {
			case "lowerRoman": return Rn(e);
			case "upperRoman": return Rn(e).toUpperCase();
			case "lowerLetter": return $n(e);
			case "upperLetter": return $n(e).toUpperCase();
			case "symbol": {
				const t = (e - 1) % Dn.length, r = Math.floor((e - 1) / Dn.length) + 1;
				return Dn[t].repeat(r);
			}
			default: return String(e);
		}
	}
	const Fn = {
		runKind: "footnoteReference",
		getRef: (e) => {
			const t = B(e);
			return t ? {
				id: t.footnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: Pn
	};
	const Mn = {
		runKind: "endnoteReference",
		getRef: (e) => {
			const t = U(e);
			return t ? {
				id: t.endnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: Pn
	};
	const On = /* @__PURE__ */ new Set(["_GoBack"]);
	function Ln(e, t, r) {
		if ("paragraph" === e.type) {
			let n = 0;
			const o = [];
			for (const i of e.runs) {
				const a = i.__importedBookmark;
				a ? (t.push({
					marker: a,
					anchor: {
						paragraphId: e.id,
						offset: n,
						seq: r.value
					}
				}), r.value += 1) : (n += i.text.length, o.push(i));
			}
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [E("")]);
			return;
		}
		for (const n of e.rows) for (const e of n.cells) for (const n of e.blocks) Ln(n, t, r);
	}
	function Bn(e) {
		const t = [], r = { value: 0 }, n = (e) => {
			e?.forEach((e) => Ln(e, t, r));
		};
		for (const c of e) n(c.blocks), n(c.header), n(c.firstPageHeader), n(c.evenPageHeader), n(c.footer), n(c.firstPageFooter), n(c.evenPageFooter);
		if (0 === t.length) return;
		const o = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
		for (const c of t) {
			const e = "start" === c.marker.kind ? o : i, t = e.get(c.marker.docxId);
			t ? t.push(c) : e.set(c.marker.docxId, [c]);
		}
		const a = {}, s = [], l = t.filter((e) => "start" === e.marker.kind);
		for (const c of l) {
			const { marker: e, anchor: t } = c, r = e.name;
			if (!r || On.has(r)) continue;
			const n = Number.parseInt(e.docxId, 10), o = i.get(e.docxId)?.shift(), l = y(), u = {
				id: l,
				name: r,
				start: t
			};
			r.startsWith("_") && (u.hidden = !0), Number.isNaN(n) || (u.docxIdHint = n), void 0 !== e.colFirst && (u.colFirst = e.colFirst), void 0 !== e.colLast && (u.colLast = e.colLast), o && (u.end = o.anchor), a[l] = u, s.push(l);
		}
		return 0 !== s.length ? {
			items: a,
			order: s
		} : void 0;
	}
	function Un(e, t, r) {
		if ("paragraph" === e.type) {
			let n = 0;
			const o = [];
			for (const i of e.runs) {
				const a = i.__importedComment;
				a ? (t.push({
					marker: a,
					anchor: {
						paragraphId: e.id,
						offset: n,
						seq: r.value
					}
				}), r.value += 1) : (n += i.text.length, o.push(i));
			}
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [E("")]);
			return;
		}
		for (const n of e.rows) for (const e of n.cells) for (const n of e.blocks) Un(n, t, r);
	}
	function zn(e) {
		const t = [], r = { value: 0 }, n = (e) => {
			e?.forEach((e) => Un(e, t, r));
		};
		for (const i of e) n(i.blocks), n(i.header), n(i.firstPageHeader), n(i.evenPageHeader), n(i.footer), n(i.firstPageFooter), n(i.evenPageFooter);
		const o = /* @__PURE__ */ new Map();
		for (const { marker: i, anchor: a } of t) {
			const e = o.get(i.docxId) ?? {};
			"start" === i.kind ? e.start = a : e.end = a, o.set(i.docxId, e);
		}
		return o;
	}
	const Hn = "http://schemas.microsoft.com/office/word/2012/wordml";
	function jn(e) {
		let t = "";
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			if (n?.nodeType !== n.ELEMENT_NODE) continue;
			const o = n;
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
			t += jn(o);
		}
		return t;
	}
	function qn(e) {
		if (!e) return;
		const t = Date.parse(e);
		return Number.isNaN(t) ? void 0 : t;
	}
	function Wn(e, t) {
		const r = /* @__PURE__ */ new Map();
		if (!e) return r;
		const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!n) return r;
		const o = function(e) {
			const t = /* @__PURE__ */ new Map();
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return t;
			for (const n of Ie(r, Hn, "commentEx")) {
				const e = n.getAttributeNS(Hn, "paraId");
				if (!e) continue;
				const r = n.getAttributeNS(Hn, "done"), o = n.getAttributeNS(Hn, "paraIdParent") || void 0;
				t.set(e, {
					resolved: "1" === r || "true" === r,
					...o ? { parentParaId: o } : {}
				});
			}
			return t;
		}(t);
		for (const i of Ie(n, Se, "comment")) {
			const e = Pe(i, "id");
			if (null === e) continue;
			const t = Pe(i, "author") ?? "", n = Pe(i, "initials") ?? void 0, a = qn(Pe(i, "date")), s = qn(i.getAttributeNS("http://schemas.microsoft.com/office/word/2023/wordml/word16du", "dateUtc")), l = Ie(i, Se, "p"), c = l.map((e) => jn(e)).join("\n").trim(), u = l.length > 0 ? Pe(l[0], "paraId") ?? void 0 : void 0, d = void 0 !== u ? o.get(u) : void 0;
			r.set(e, {
				author: t,
				...n ? { initials: n } : {},
				...void 0 !== a ? { date: a } : {},
				...void 0 !== s ? { dateUtc: s } : {},
				text: c,
				...d?.resolved ? { resolved: !0 } : {},
				...u ? { paraId: u } : {},
				...d?.parentParaId ? { parentParaId: d.parentParaId } : {}
			});
		}
		return r;
	}
	async function Gn(e, t = {}) {
		t.onProgress?.("opening-docx");
		const r = await w.default.loadAsync(e), n = await r.file("word/document.xml")?.async("string");
		if (!n) throw new Error("Missing word/document.xml");
		const o = We(await r.file("word/_rels/document.xml.rels")?.async("string")), i = function(e) {
			const t = {
				abstractLevels: /* @__PURE__ */ new Map(),
				numOverrideLevels: /* @__PURE__ */ new Map(),
				numStartOverrides: /* @__PURE__ */ new Map(),
				numToAbstractId: /* @__PURE__ */ new Map(),
				seenInstances: /* @__PURE__ */ new Set()
			};
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return t;
			for (const n of Array.from(r.getElementsByTagNameNS(Se, "abstractNum"))) {
				const e = Pe(n, "abstractNumId");
				if (e) for (const r of Ie(n, Se, "lvl")) {
					const n = Pe(r, "ilvl") ?? "0";
					t.abstractLevels.set(`${e}:${n}`, mt(r));
				}
			}
			for (const n of Array.from(r.getElementsByTagNameNS(Se, "num"))) {
				const e = Pe(n, "numId"), r = Pe(Re(n, Se, "abstractNumId"), "val");
				if (e && r) {
					t.numToAbstractId.set(e, r);
					for (const r of Ie(n, Se, "lvlOverride")) {
						const n = Pe(r, "ilvl") ?? "0", o = Re(r, Se, "lvl");
						o && t.numOverrideLevels.set(`${e}:${n}`, mt(o));
						const i = ft(Re(r, Se, "startOverride"));
						void 0 !== i && t.numStartOverrides.set(`${e}:${n}`, i);
					}
				}
			}
			return t;
		}(await r.file("word/numbering.xml")?.async("string") ?? null), a = function(e) {
			const t = { adjustLineHeightInTable: !0 };
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml"), n = Ke(Pe(Re(r.documentElement, Se, "defaultTabStop"), "val"));
			void 0 !== n && (t.defaultTabStop = n);
			const o = Re(r.documentElement, Se, "autoHyphenation");
			if (o) {
				const e = Pe(o, "val");
				t.autoHyphenation = "0" !== e && "false" !== e;
			}
			const i = Re(r.documentElement, Se, "doNotHyphenateCaps");
			if (i) {
				const e = Pe(i, "val");
				t.doNotHyphenateCaps = "0" !== e && "false" !== e;
			}
			const a = Number.parseInt(Pe(Re(r.documentElement, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "consecutiveHyphenLimit"), "val") ?? "", 10);
			Number.isFinite(a) && a >= 0 && (t.consecutiveHyphenLimit = a);
			const s = Ke(Pe(Re(r.documentElement, Se, "hyphenationZone"), "val"));
			void 0 !== s && (t.hyphenationZone = s), t.footnoteSettings = lt(Re(r.documentElement, Se, "footnotePr")), t.endnoteSettings = lt(Re(r.documentElement, Se, "endnotePr"));
			const l = Re(r.documentElement, Se, "compat");
			if (l) {
				const e = Re(l, Se, "adjustLineHeightInTable");
				if (e) {
					const r = Pe(e, "val");
					t.adjustLineHeightInTable = "0" !== r && "false" !== r;
				}
				const r = Re(l, Se, "allowSpaceOfSameStyleInTable");
				if (r) {
					const e = Pe(r, "val");
					t.allowSpaceOfSameStyleInTable = "0" !== e && "false" !== e;
				}
			}
			return t;
		}(await r.file("word/settings.xml")?.async("string") ?? null), s = await r.file("word/styles.xml")?.async("string") ?? null, l = function(e) {
			if (!e) return;
			const t = new b.DOMParser().parseFromString(e, "application/xml").getElementsByTagNameNS(Se, "fonts")[0];
			if (!t) return;
			const r = [];
			for (const n of Ie(t, Se, "font")) {
				const e = Pe(n, "name");
				if (!e) continue;
				const t = { name: e }, o = Pe(Re(n, Se, "altName"), "val");
				o && (t.altName = o);
				const i = Pe(Re(n, Se, "family"), "val");
				i && (t.family = i);
				const a = Pe(Re(n, Se, "pitch"), "val");
				a && (t.pitch = a);
				const s = Pe(Re(n, Se, "charset"), "val");
				s && (t.charset = s);
				const l = Pe(Re(n, Se, "panose1"), "val");
				l && (t.panose1 = l);
				const c = Re(n, Se, "sig");
				if (c) {
					const e = {};
					for (let t = 0; t < c.attributes.length; t += 1) {
						const r = c.attributes[t];
						e[r.localName ?? r.name] = r.value;
					}
					Object.keys(e).length > 0 && (t.sig = e);
				}
				r.push(t);
			}
			return r.length > 0 ? r : void 0;
		}(await r.file("word/fontTable.xml")?.async("string") ?? null), c = await r.file("word/theme/theme1.xml")?.async("string") ?? null, u = null !== c, d = it(c), p = function(e, t) {
			if (!e) return;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return;
			const n = Re(r, Se, "docDefaults"), o = Re(Re(n, Se, "pPrDefault"), Se, "pPr"), i = Re(Re(n, Se, "rPrDefault"), Se, "rPr"), a = o ? {
				spacingBefore: 0,
				spacingAfter: 0,
				...jt(qt(o, t.colors))
			} : jt(qt(o, t.colors)), s = _t(i, t), l = {};
			let c;
			for (const u of Ie(r, Se, "style")) {
				const e = Pe(u, "styleId"), r = Pe(u, "type");
				if (!e || "paragraph" !== r && "character" !== r && "table" !== r) continue;
				const n = Pe(Re(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "name"), "val") ?? e, o = Pe(Re(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "basedOn"), "val") ?? void 0, i = Pe(Re(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "next"), "val") ?? void 0, d = Le(u, "qFormat"), p = Le(u, "semiHidden"), f = Le(u, "unhideWhenUsed"), h = Pe(Re(u, Se, "uiPriority"), "val"), m = null === h ? NaN : Number(h), g = Number.isInteger(m) && m >= 0 ? m : void 0, w = jt(qt(Re(u, Se, "pPr"), t.colors)), b = _t(Re(u, Se, "rPr"), t);
				let v;
				if ("table" === r) {
					const r = Re(u, Se, "tblPr"), n = (e) => {
						const t = Pe(Re(r, Se, e), "val"), n = t ? Number(t) : NaN;
						return Number.isFinite(n) && n > 0 ? Math.floor(n) : void 0;
					}, o = n("tblStyleRowBandSize"), i = n("tblStyleColBandSize"), a = {};
					for (const e of Ie(u, Se, "tblStylePr")) {
						const r = Pe(e, "type");
						if (!r) continue;
						const n = Re(e, Se, "tcPr"), o = Ut(n, void 0, t.colors), i = Ft(Re(e, Se, "tblPr")), s = Et(Re(n, Se, "shd"), t.colors), l = _t(Re(e, Se, "rPr"), t), c = yt(bt(Re(n, Se, "tcBorders"))), u = qt(Re(e, Se, "pPr"), t.colors), d = Mt(Re(e, Se, "trPr"));
						(s || l || c || u || d || o || i) && (a[r] = {
							...s ? { shading: s } : {},
							...l ? { textStyle: l } : {},
							...c ? { borders: c } : {},
							...u ? { paragraphStyle: u } : {},
							...d ? { rowStyle: d } : {},
							...o ? { cellStyle: o } : {},
							...i ? { tableStyle: i } : {}
						});
					}
					v = {
						...Ft(r, e) ?? { styleId: e },
						...void 0 !== o ? { rowBandSize: o } : {},
						...void 0 !== i ? { colBandSize: i } : {},
						...Object.keys(a).length > 0 ? { conditionalFormats: a } : {}
					};
				}
				const y = "paragraph" === r && Oe(Pe(u, "default"));
				y && (c = e), l[e] = {
					id: e,
					name: n,
					type: r,
					isDefault: Oe(Pe(u, "default")),
					basedOn: o,
					nextStyle: i,
					qFormat: d,
					uiPriority: g,
					semiHidden: p,
					unhideWhenUsed: f,
					paragraphStyle: "paragraph" === r && y ? xt(a, w) : w,
					textStyle: "paragraph" === r && y ? xt(s, b) : b,
					tableStyle: v
				};
			}
			return c && l[c] ? l : ((a || s) && (l.Normal = {
				id: "Normal",
				name: "Normal",
				type: "paragraph",
				paragraphStyle: a,
				textStyle: s
			}), yt(l));
		}(s, d);
		t.onProgress?.("parsing-document");
		const f = new b.DOMParser().parseFromString(n, "application/xml"), h = f.documentElement ? Re(f.documentElement, Se, "background") : null, m = h?.getAttribute("w:color") ?? h?.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "color") ?? null, g = f.getElementsByTagNameNS(Se, "body")[0];
		if (!g) return de([N([{ text: "" }])]);
		const v = {
			assets: {},
			byPath: /* @__PURE__ */ new Map(),
			nextId: 1
		};
		let y = null;
		const E = [], S = [[]];
		let k = !1, _ = null;
		const T = (e) => {
			k && (e.style = {
				...e.style ?? {},
				pageBreakBefore: !0
			}, k = !1), _ && "paragraph" === e.type && (e.dropCap = _, _ = null), S[S.length - 1].push(e);
		};
		let I = 0;
		for (let w = 0; w < g.childNodes.length; w += 1) {
			const e = g.childNodes[w];
			if (e?.nodeType === e.ELEMENT_NODE) {
				const t = e;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && "sectPr" !== t.localName && (I += 1);
			}
		}
		let A = 0;
		const C = () => {
			A += 1, I > 0 && t.onProgress?.("parsing-document", A / I);
		}, R = Sn(i, r, o, v, d);
		for (let w = 0; w < g.childNodes.length; w += 1) {
			const e = g.childNodes[w];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const t = e;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI) {
				if ("sectPr" === t.localName) E.push(Xt(t)), S.push([]), k = !1;
				else if ("p" === t.localName) {
					const e = await hn(t, i, r, o, v, d, R);
					for (const t of e.paragraphs) T(t);
					e.dropCapFrame && (_ = e.dropCapFrame), e.pageBreakAfter && (k = !0);
					const n = Re(t, Se, "pPr"), a = n ? Re(n, Se, "sectPr") : null;
					a && (E.push(Xt(a)), S.push([]), k = !1), C();
				} else if ("tbl" === t.localName) T(await yn(t, 0, 0, 0, 0, d, R)), C();
				else if ("sdt" === t.localName) {
					for (const e of await En(t, i, r, o, v, d, R)) T(e);
					C();
				}
				await Ue(50, A);
			}
		}
		if (0 === E.length) {
			const e = Re(g, Se, "sectPr");
			E.push(e ? Xt(e) : {
				pageSettings: Zt(g),
				headerRIds: {},
				footerRIds: {}
			});
		}
		t.onProgress?.("parsing-headers-footers");
		const $ = [], D = (e) => Object.keys(e.headerRIds).length > 0 || Object.keys(e.footerRIds).length > 0, P = E.filter(D).length;
		let F = 0;
		const M = () => {
			F += 1, P > 0 && t.onProgress?.("parsing-headers-footers", F / P);
		};
		for (let w = 0; w < E.length; w += 1) {
			const e = E[w], t = S[w] ?? [];
			Yt(t, e.docGridLinePitchPx, e.docGridMode, e.docGridType, a);
			const n = async (t) => {
				if (!t) return [];
				const n = o.get(t);
				if (!n) return [];
				let s = n.startsWith("/") ? n.slice(1) : n;
				s.startsWith("word/") || (s = `word/${n}`);
				const l = await r.file(s)?.async("string"), c = await Ge(r, s);
				if (!y && l) {
					const e = l.match(/<v:textpath[^>]*string="([^"]+)"/i), t = l.match(/<v:shape\b([^>]*)>/i)?.[1] ?? "", n = (e) => t.match(new RegExp(`${e}="([^"]+)"`, "i"))?.[1], o = (e) => e.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
					if (e?.[1]) y = {
						kind: "text",
						text: o(e[1]),
						color: n("fillcolor"),
						opacity: Number(n("fillopacity")) || void 0,
						rotation: Number(n("rotation")) || void 0
					};
					else {
						const e = l.match(/<v:imagedata[^>]*(?:r:id|id)="([^"]+)"/i)?.[1], t = e ? c.get(e) : void 0;
						if (t) {
							const e = t.startsWith("../") ? `word/${t.slice(3)}` : t, o = await qe(r, v, e);
							o && (y = {
								kind: "image",
								src: o,
								color: n("fillcolor"),
								opacity: Number(n("fillopacity")) || void 0,
								rotation: Number(n("rotation")) || void 0
							});
						}
					}
				}
				const u = await Nn(l ?? null, i, r, c, v, d);
				return Yt(u, e.docGridLinePitchPx, e.docGridMode, e.docGridType, a), u;
			}, s = await n(e.headerRIds.default), l = await n(e.headerRIds.first), c = await n(e.headerRIds.even), u = await n(e.footerRIds.default), p = await n(e.footerRIds.first), f = await n(e.footerRIds.even);
			D(e) && M(), await Ue(2, F);
			const h = Z(e.pageSettings ?? {
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
			}), m = w > 0 ? E[w - 1]?.breakType : void 0, g = e.pageNumbering, b = e.verticalAlignment, x = e.bidi, k = e.propertyRevision ? {
				...e.propertyRevision,
				previous: {
					...e.propertyRevision.previous,
					pageSettings: Z(e.propertyRevision.previous.pageSettings)
				}
			} : void 0;
			$.push({
				id: `section:${w + 1}`,
				blocks: t.length > 0 ? t : [N([{ text: "" }])],
				pageSettings: h,
				...e.pageBorder ? { pageBorder: e.pageBorder } : {},
				header: s.length > 0 ? s : void 0,
				firstPageHeader: l.length > 0 ? l : void 0,
				evenPageHeader: c.length > 0 ? c : void 0,
				footer: u.length > 0 ? u : void 0,
				firstPageFooter: p.length > 0 ? p : void 0,
				evenPageFooter: f.length > 0 ? f : void 0,
				...m ? { breakType: m } : {},
				...g ? { pageNumbering: g } : {},
				...b ? { verticalAlignment: b } : {},
				...x ? { bidi: x } : {},
				...k ? { propertyRevision: k } : {}
			});
		}
		const O = await r.file("word/footnotes.xml")?.async("string") ?? null, B = await async function(e, t, r, n, o, i) {
			const a = await _n("footnote", e, t, r, n, o, i);
			return {
				byDocxId: a.byDocxId,
				footnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(O, i, r, O ? await Ge(r, "word/footnotes.xml") : /* @__PURE__ */ new Map(), v, d);
		a.footnoteSettings && (B.footnotes.settings = a.footnoteSettings);
		const U = Object.keys(B.footnotes.items).length > 0 || B.footnotes.separator || B.footnotes.continuationSeparator || B.footnotes.settings ? B.footnotes : void 0;
		(function(e, t) {
			const r = (e) => {
				if ("paragraph" !== e.type) for (const t of e.rows) for (const e of t.cells) for (const t of e.blocks) r(t);
				else e.runs.forEach((r, n) => {
					const o = r, i = o.__importedFootnoteRef;
					if (!i) return;
					delete o.__importedFootnoteRef;
					const a = t.get(i.docxId);
					a && (e.runs[n] = {
						id: r.id,
						text: r.text,
						styles: r.styles,
						revision: r.revision,
						kind: "footnoteReference",
						footnoteReference: {
							footnoteId: a.id,
							...i.customMark ? { customMark: i.customMark } : {}
						}
					});
				});
			};
			Vn(e, r);
		})($, B.byDocxId);
		const z = await r.file("word/endnotes.xml")?.async("string") ?? null, j = await async function(e, t, r, n, o, i) {
			const a = await _n("endnote", e, t, r, n, o, i);
			return {
				byDocxId: a.byDocxId,
				endnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(z, i, r, z ? await Ge(r, "word/endnotes.xml") : /* @__PURE__ */ new Map(), v, d);
		a.endnoteSettings && (j.endnotes.settings = a.endnoteSettings);
		const q = Object.keys(j.endnotes.items).length > 0 || j.endnotes.separator || j.endnotes.continuationSeparator || j.endnotes.settings ? j.endnotes : void 0;
		(function(e, t) {
			const r = (e) => {
				if ("paragraph" !== e.type) for (const t of e.rows) for (const e of t.cells) for (const t of e.blocks) r(t);
				else e.runs.forEach((r, n) => {
					const o = r, i = o.__importedEndnoteRef;
					if (!i) return;
					delete o.__importedEndnoteRef;
					const a = t.get(i.docxId);
					a && (e.runs[n] = {
						id: r.id,
						text: r.text,
						styles: r.styles,
						revision: r.revision,
						kind: "endnoteReference",
						endnoteReference: {
							endnoteId: a.id,
							...i.customMark ? { customMark: i.customMark } : {}
						}
					});
				});
			};
			Vn(e, r);
		})($, j.byDocxId);
		const W = Bn($), G = function(e, t) {
			const r = /* @__PURE__ */ new Set([...e.keys(), ...t.keys()]);
			if (0 === r.size) return;
			const n = [...r].sort((e, t) => {
				const r = Number.parseInt(e, 10), n = Number.parseInt(t, 10);
				return Number.isNaN(r) || Number.isNaN(n) ? e.localeCompare(t) : r - n;
			}), o = /* @__PURE__ */ new Map();
			for (const l of n) o.set(l, x());
			const i = /* @__PURE__ */ new Map();
			for (const [l, c] of t) {
				const e = o.get(l);
				e && c.paraId && i.set(c.paraId, e);
			}
			const a = {}, s = [];
			for (const l of n) {
				const r = e.get(l), n = t.get(l);
				if (!r && !n) continue;
				const c = o.get(l), u = n?.parentParaId ? i.get(n.parentParaId) : void 0, d = Number.parseInt(l, 10);
				a[c] = {
					id: c,
					author: n?.author ?? "",
					...n?.initials ? { initials: n.initials } : {},
					...void 0 !== n?.date ? { date: n.date } : {},
					...void 0 !== n?.dateUtc ? { dateUtc: n.dateUtc } : {},
					...n?.resolved ? { resolved: n.resolved } : {},
					...u ? { parentId: u } : {},
					text: n?.text ?? "",
					...r?.start ? { start: r.start } : {},
					...r?.end ? { end: r.end } : {},
					...Number.isNaN(d) ? {} : { docxIdHint: d }
				}, s.push(c);
			}
			return s.length > 0 ? {
				items: a,
				order: s
			} : void 0;
		}(zn($), Wn(await r.file("word/comments.xml")?.async("string") ?? null, await r.file("word/commentsExtended.xml")?.async("string") ?? null)), V = $.length > 1 || $.some((e) => (e.header?.length ?? 0) > 0 || (e.firstPageHeader?.length ?? 0) > 0 || (e.evenPageHeader?.length ?? 0) > 0 || (e.footer?.length ?? 0) > 0 || (e.firstPageFooter?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0 || void 0 !== e.breakType || void 0 !== e.pageNumbering || void 0 !== e.verticalAlignment || void 0 !== e.bidi || void 0 !== e.pageBorder), X = Object.keys(v.assets).length > 0, Y = (e) => {
			if (u) {
				const t = d.data?.name?.toLowerCase() ?? "", r = [
					"oasis",
					"office",
					"facet",
					"integral",
					"ion",
					"retrospect"
				].find((e) => t.includes(e));
				e.design = {
					...e.design ?? {},
					...r ? { themeId: r } : {},
					...d.data ? { themeData: d.data } : {}
				};
			}
			m && (e.design = {
				...e.design ?? {},
				pageColor: `#${m.replace(/^#/, "")}`
			}), y && (e.design = {
				...e.design ?? {},
				watermark: y
			});
			const t = {};
			void 0 !== a.defaultTabStop && (t.defaultTabStop = a.defaultTabStop), a.allowSpaceOfSameStyleInTable && (t.allowSpaceOfSameStyleInTable = !0), a.autoHyphenation && (t.autoHyphenation = !0), a.doNotHyphenateCaps && (t.doNotHyphenateCaps = !0), void 0 !== a.consecutiveHyphenLimit && (t.consecutiveHyphenLimit = a.consecutiveHyphenLimit), void 0 !== a.hyphenationZone && (t.hyphenationZone = a.hyphenationZone), Object.keys(t).length > 0 && (e.settings = {
				...e.settings ?? {},
				...t
			}), l && (e.fontTable = l);
			let r = e;
			return U && (r.footnotes = U, r = function(e) {
				const t = e.footnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: r, sectionsChanged: n, nextItems: o, itemsChanged: i } = An(e, t, Fn);
				return n || i ? {
					...e,
					sections: n ? r : e.sections,
					footnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(r)), q && (r.endnotes = q, r = function(e) {
				const t = e.endnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: r, sectionsChanged: n, nextItems: o, itemsChanged: i } = An(e, t, Mn);
				return n || i ? {
					...e,
					sections: n ? r : e.sections,
					endnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(r)), W && (r.bookmarks = W), G && (r.comments = G), r;
		};
		if (V) {
			const e = de([]);
			return e.sections = $, 1 === $.length && (e.pageSettings = $[0].pageSettings), p && (e.styles = p), X && (e.assets = v.assets), Y(e);
		}
		const Q = $[0], K = de(Q?.blocks.length > 0 ? Q.blocks : [N([{ text: "" }])], Q?.pageSettings);
		return X && (K.assets = v.assets), p && (K.styles = p), Y(K);
	}
	function Vn(e, t) {
		for (const r of e) r.blocks.forEach(t), r.header?.forEach(t), r.firstPageHeader?.forEach(t), r.evenPageHeader?.forEach(t), r.footer?.forEach(t), r.firstPageFooter?.forEach(t), r.evenPageFooter?.forEach(t);
	}
	function Xn(e) {
		return e.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
	}
	function Zn(e) {
		return e.replaceAll("\\", "/").replace(/^\/+/, "");
	}
	function Yn(e) {
		if ("_rels/.rels" === e) return null;
		const t = e.lastIndexOf("/_rels/");
		return t >= 0 && e.endsWith(".rels") ? `${e.slice(0, t)}/${e.slice(t + 7).slice(0, -5)}` : e.startsWith("_rels/") && e.endsWith(".rels") ? e.slice(6, -5) : void 0;
	}
	function Qn(e) {
		if (!e) return [];
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!t) return [];
		const r = [];
		for (let n = 0; n < t.childNodes.length; n += 1) {
			const e = t.childNodes[n];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const o = e;
			if ("Relationship" !== o.localName) continue;
			const i = o.getAttribute("Id"), a = o.getAttribute("Type"), s = o.getAttribute("Target");
			if (!i || !a || !s) continue;
			const l = o.getAttribute("TargetMode");
			r.push({
				id: i,
				type: a,
				target: s,
				targetMode: "External" === l ? "External" : "Internal"
			});
		}
		return r;
	}
	function Kn(e) {
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${e.map((e) => {
			const t = "External" === e.targetMode ? " TargetMode=\"External\"" : "";
			return `<Relationship Id="${Xn(e.id)}" Type="${Xn(e.type)}" Target="${Xn(e.target)}"${t}/>`;
		}).join("")}</Relationships>`;
	}
	function Jn(e, t, r) {
		return t.map((t) => {
			if ("External" === t.targetMode) return {
				...t,
				resolvedTarget: void 0
			};
			const n = function(e, t) {
				const r = t.replaceAll("\\", "/"), n = e?.includes("/") ? e.slice(0, e.lastIndexOf("/") + 1) : "", o = r.startsWith("/") ? r.slice(1) : `${n}${r}`, i = [];
				for (const a of o.split("/")) if (a && "." !== a) if (".." !== a) i.push(a);
				else {
					if (0 === i.length) return null;
					i.pop();
				}
				return i.join("/");
			}(e, t.target);
			return n ? {
				...t,
				resolvedTarget: n
			} : (r?.(t), t);
		});
	}
	const eo = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", to = "http://schemas.openxmlformats.org/package/2006/relationships", ro = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", no = "http://schemas.microsoft.com/office/word/2010/wordml";
	function oo(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
	}
	function io(e, t) {
		return Number.isFinite(e) ? Math.max(0, Math.round(e / 96 * C)) : t;
	}
	function ao(e) {
		return null != e && Number.isFinite(e) ? Math.round(e / 96 * C) : null;
	}
	function so(e) {
		return null != e && Number.isFinite(e) ? Math.max(0, Math.round(20 * e)) : null;
	}
	function lo(e, t = "000000") {
		return gr(e) ?? t;
	}
	function co(e) {
		return `<w:shd w:val="clear" w:color="auto" w:fill="${lo(e, "FFFFFF")}"/>`;
	}
	function uo(e) {
		if ("end" === e.kind) return `<w:bookmarkEnd w:id="${e.wId}"/>`;
		const t = (void 0 !== e.colFirst ? ` w:colFirst="${e.colFirst}"` : "") + (void 0 !== e.colLast ? ` w:colLast="${e.colLast}"` : "");
		return `<w:bookmarkStart w:id="${e.wId}" w:name="${oo(e.name ?? "")}"${t}/>`;
	}
	function po(e) {
		switch (e.kind) {
			case "start": return `<w:commentRangeStart w:id="${e.wId}"/>`;
			case "end": return `<w:commentRangeEnd w:id="${e.wId}"/>`;
			case "reference": return `<w:r><w:commentReference w:id="${e.wId}"/></w:r>`;
		}
	}
	const fo = `xmlns:w="${eo}" xmlns:w14="${no}" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"`;
	function ho(e) {
		const t = e.comments.map(({ comment: e, wId: t, paraId: r }) => {
			const n = void 0 !== e.date ? ` w:date="${new Date(e.date).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", o = void 0 !== e.dateUtc ? ` w16du:dateUtc="${new Date(e.dateUtc).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", i = e.initials ? ` w:initials="${oo(e.initials)}"` : "";
			return `<w:comment w:id="${t}" w:author="${oo(e.author)}"${n}${o}${i}><w:p w14:paraId="${r}">${a = e.text, `<w:r>${a.split("\n").map((e, t) => `${t > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${oo(e)}</w:t>`).join("")}</w:r>`}</w:p></w:comment>`;
			var a;
		}).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${fo}>${t}</w:comments>`;
	}
	function mo(e) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= 1;
	}
	function go(e) {
		let t = 1;
		for (const n of Object.values(e)) mo(n.docxId) && (t = Math.max(t, n.docxId + 1));
		const r = /* @__PURE__ */ new Set();
		return (e) => {
			if (mo(e.docxId) && !r.has(e.docxId)) return r.add(e.docxId), e.docxId;
			for (; r.has(t);) t += 1;
			const n = t;
			return r.add(n), t += 1, n;
		};
	}
	function wo(e, t = "000000") {
		return "none" === e.type || e.width <= 0 ? "w:val=\"nil\"/>" : `w:val="${"dotted" === e.type ? "dotted" : "dashed" === e.type ? "dashed" : "single"}" w:sz="${Math.max(1, Math.round(8 * e.width))}" w:space="0" w:color="${lo(e.color, t)}"/>`;
	}
	function bo(e) {
		const t = [
			["top", e.borderTop],
			["left", e.borderLeft],
			["bottom", e.borderBottom],
			["right", e.borderRight],
			["between", e.borderBetween],
			["bar", e.borderBar]
		].filter((e) => null != e[1]).map(([e, t]) => `<w:${e} ${wo(t)}`);
		return t.length > 0 ? `<w:pBdr>${t.join("")}</w:pBdr>` : "";
	}
	const vo = "6F6F6F";
	function yo(e) {
		return e ? Object.entries(e).map(([e, t]) => ` ${e}="${oo(t)}"`).join("") : "";
	}
	function xo(e) {
		const t = /^\d+$/.test(e.id) ? e.id : String(Array.from(e.id).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0)), r = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${t}" w:author="${oo(e.author)}" w:date="${r}"`;
	}
	function Eo(e) {
		if (!e || 0 === Object.keys(e).length) return "";
		const t = Tt.filter(([, t]) => void 0 !== e[t]).map(([t, r]) => `w:${t}="${e[r] ? "1" : "0"}"`).join(" ");
		return t ? `<w:cnfStyle ${t}/>` : "";
	}
	function So(e, t) {
		return void 0 === t ? "" : t ? `<w:${e}/>` : `<w:${e} w:val="0"/>`;
	}
	function No(e, t, r = {}) {
		if ("number" == typeof t && Number.isFinite(t)) return `<w:${e} w:w="${so(t) ?? 0}" w:type="dxa"/>`;
		if ("string" == typeof t) {
			const r = t.trim();
			if ("auto" === r) return `<w:${e} w:w="0" w:type="auto"/>`;
			if (r.endsWith("%")) {
				const t = Number.parseFloat(r.slice(0, -1));
				if (Number.isFinite(t)) return `<w:${e} w:w="${Math.round(50 * t)}" w:type="pct"/>`;
			}
			const n = Number.parseFloat(r);
			if (Number.isFinite(n)) return `<w:${e} w:w="${Math.round(n)}" w:type="dxa"/>`;
		}
		return r.fallbackAuto ? `<w:${e} w:w="0" w:type="auto"/>` : "";
	}
	function ko(e, t = !0) {
		return No("tblW", e, { fallbackAuto: t });
	}
	function _o(e) {
		return wo(e ?? {
			width: .75,
			type: "solid",
			color: `#${vo}`
		}, vo);
	}
	function To(e) {
		if (!e) return "";
		const t = [], r = (e, r) => {
			void 0 !== r && Number.isFinite(r) && t.push(`<w:${e} w:w="${so(r) ?? 0}" w:type="dxa"/>`);
		};
		return r("top", e.top), r("left", e.left), r("bottom", e.bottom), r("right", e.right), r("start", e.start), r("end", e.end), t.length > 0 ? `<w:tblCellMar>${t.join("")}</w:tblCellMar>` : "";
	}
	function Io(e, t) {
		const r = Math.max(1, Math.floor(e.colSpan ?? 1)), n = [], o = Eo(e.conditionalStyle);
		o && n.push(o);
		const i = function(e) {
			return No("tcW", e);
		}(e.style?.width ?? t);
		i && n.push(i), r > 1 && n.push(`<w:gridSpan w:val="${r}"/>`), "restart" === e.vMerge ? n.push("<w:vMerge w:val=\"restart\"/>") : "continue" === e.vMerge && n.push("<w:vMerge/>"), e.style?.shading && n.push(co(e.style.shading));
		const a = So("noWrap", e.style?.noWrap);
		a && n.push(a);
		const s = So("tcFitText", e.style?.fitText);
		if (s && n.push(s), e.style?.headers && n.push(`<w:headers w:val="${oo(e.style.headers)}"/>`), e.style?.verticalAlign) {
			const t = "middle" === e.style.verticalAlign ? "center" : e.style.verticalAlign;
			n.push(`<w:vAlign w:val="${t}"/>`);
		}
		e.style?.textDirection && n.push(`<w:textDirection w:val="${e.style.textDirection}"/>`), n.push(function(e) {
			const t = e.style, r = t?.padding, n = so(r ?? t?.paddingTop ?? 0), o = so(r ?? t?.paddingBottom ?? 0);
			return `<w:tcMar><w:top w:w="${n ?? 0}" w:type="dxa"/><w:left w:w="${so(r ?? t?.paddingLeft ?? 5.4) ?? 0}" w:type="dxa"/><w:bottom w:w="${o ?? 0}" w:type="dxa"/><w:right w:w="${so(r ?? t?.paddingRight ?? 5.4) ?? 0}" w:type="dxa"/>${void 0 !== t?.paddingStart ? `<w:start w:w="${so(t.paddingStart) ?? 0}" w:type="dxa"/>` : ""}${void 0 !== t?.paddingEnd ? `<w:end w:w="${so(t.paddingEnd) ?? 0}" w:type="dxa"/>` : ""}</w:tcMar>`;
		}(e)), n.push(function(e) {
			const t = [
				`<w:top ${_o(e.style?.borderTop)}`,
				`<w:left ${_o(e.style?.borderLeft)}`,
				`<w:bottom ${_o(e.style?.borderBottom)}`,
				`<w:right ${_o(e.style?.borderRight)}`
			];
			return e.style?.borderStart && t.push(`<w:start ${_o(e.style.borderStart)}`), e.style?.borderEnd && t.push(`<w:end ${_o(e.style.borderEnd)}`), e.style?.borderTopLeftToBottomRight && t.push(`<w:tl2br ${_o(e.style.borderTopLeftToBottomRight)}`), e.style?.borderTopRightToBottomLeft && t.push(`<w:tr2bl ${_o(e.style.borderTopRightToBottomLeft)}`), `<w:tcBorders>${t.join("")}</w:tcBorders>`;
		}(e));
		const l = So("hideMark", e.style?.hideMark);
		if (l && n.push(l), e.style?.propertyRevision) {
			const t = e.style.propertyRevision, r = Io({
				...e,
				style: t.previous
			});
			n.push(`<w:tcPrChange ${xo(t)}>${r}</w:tcPrChange>`);
		}
		if (e.style?.revision) {
			const t = e.style.revision, r = "insert" === t.type ? "cellIns" : "delete" === t.type ? "cellDel" : "cellMerge", o = "merge" === t.type ? `${t.previous?.vMerge ? ` w:vMergeOrig="${"restart" === t.previous.vMerge ? "rest" : "cont"}"` : ""}${e.vMerge ? ` w:vMerge="${"restart" === e.vMerge ? "rest" : "cont"}"` : ""}` : "";
			n.push(`<w:${r} ${xo(t)}${o}/>`);
		}
		return n.length > 0 ? `<w:tcPr>${n.join("")}</w:tcPr>` : "";
	}
	function Ao(e, t) {
		if (void 0 === t || !Number.isFinite(t)) return "";
		const r = Math.floor(t);
		return r > 0 ? `<w:${e} w:val="${r}"/>` : "";
	}
	function Co(e, t) {
		const r = "number" == typeof e ? so(e) : "string" == typeof e ? Number.parseFloat(e) : null, n = null !== r && Number.isFinite(r);
		if (!n && !t) return "";
		const o = [];
		return n && o.push(`w:val="${Math.round(r)}"`), o.push(`w:hRule="${t ?? "atLeast"}"`), `<w:trHeight ${o.join(" ")}/>`;
	}
	function Ro(e) {
		if (!e) return "";
		const t = [], r = Ao("gridBefore", e.gridBefore);
		r && t.push(r);
		const n = Ao("gridAfter", e.gridAfter);
		n && t.push(n);
		const o = No("wBefore", e.widthBefore);
		o && t.push(o);
		const i = No("wAfter", e.widthAfter);
		i && t.push(i);
		const a = No("tblCellSpacing", e.cellSpacing);
		a && t.push(a);
		const s = Co(e.height, e.heightRule);
		s && t.push(s);
		const l = So("cantSplit", e.cantSplit);
		l && t.push(l);
		const c = So("hidden", e.hidden);
		c && t.push(c);
		const u = So("tblHeader", e.isHeader);
		return u && t.push(u), e.align && t.push(`<w:jc w:val="${e.align}"/>`), t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function $o(e) {
		const t = [], r = Eo(e.conditionalStyle);
		r && t.push(r);
		const n = Ao("gridBefore", e.style?.gridBefore);
		n && t.push(n);
		const o = Ao("gridAfter", e.style?.gridAfter);
		o && t.push(o);
		const i = No("wBefore", e.style?.widthBefore);
		i && t.push(i);
		const a = No("wAfter", e.style?.widthAfter);
		a && t.push(a);
		const s = No("tblCellSpacing", e.style?.cellSpacing);
		s && t.push(s);
		const l = function(e) {
			return Co(e.style?.height, e.style?.heightRule);
		}(e);
		l && t.push(l);
		const c = So("cantSplit", e.style?.cantSplit);
		c && t.push(c), (e.style?.isHeader ?? e.isHeader) && t.push("<w:tblHeader/>");
		const u = So("hidden", e.style?.hidden);
		if (u && t.push(u), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`), e.style?.propertyRevision) {
			const r = e.style.propertyRevision;
			t.push(`<w:trPrChange ${xo(r)}>${Ro(r.previous)}</w:trPrChange>`);
		}
		if (e.style?.revision && "merge" !== e.style.revision.type) {
			const r = e.style.revision, n = "insert" === r.type ? "ins" : "del";
			t.push(`<w:${n} ${xo(r)}/>`);
		}
		return t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function Do(e) {
		const t = e?.borders;
		if (!t) return "";
		const r = It.map(([e, r]) => [e, t[r]]).filter((e) => !!e[1]).map(([e, t]) => `<w:${e} ${wo(t)}`).join("");
		return r ? `<w:tblBorders>${r}</w:tblBorders>` : "";
	}
	function Po(e) {
		const t = [];
		if (e.style?.styleId && t.push(`<w:tblStyle w:val="${oo(e.style.styleId)}"/>`), e.style?.tblLook) {
			const r = e.style.tblLook;
			t.push(`<w:tblLook w:firstRow="${r.firstRow ? "1" : "0"}" w:lastRow="${r.lastRow ? "1" : "0"}" w:firstColumn="${r.firstCol ? "1" : "0"}" w:lastColumn="${r.lastCol ? "1" : "0"}" w:noHBand="${r.noHBand ? "1" : "0"}" w:noVBand="${r.noVBand ? "1" : "0"}"/>`);
		}
		e.style?.altTitle && t.push(`<w:tblCaption w:val="${oo(e.style.altTitle)}"/>`), e.style?.altDescription && t.push(`<w:tblDescription w:val="${oo(e.style.altDescription)}"/>`);
		const r = function(e) {
			if (!e || 0 === Object.keys(e).length) return "";
			const t = (e) => {
				const t = so(e);
				return null === t ? void 0 : String(t);
			}, r = {
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
			return `<w:tblpPr ${Object.entries(r).filter((e) => void 0 !== e[1]).map(([e, t]) => `w:${e}="${oo(t)}"`).join(" ")}/>`;
		}(e.style?.floating);
		r && t.push(r);
		const n = e.gridCols && e.gridCols.length > 0 ? e.gridCols.reduce((e, t) => e + t, 0) : void 0;
		t.push(ko(e.style?.width ?? n)), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`);
		const o = No("tblCellSpacing", e.style?.cellSpacing);
		o && t.push(o);
		const i = To(e.style?.defaultCellMargins);
		i && t.push(i);
		const a = Do(e.style);
		a && t.push(a);
		const s = No("tblInd", e.style?.indentLeft);
		s && t.push(s), t.push(`<w:tblLayout w:type="${e.style?.layout ?? "fixed"}"/>`);
		const l = So("bidiVisual", e.style?.bidiVisual);
		if (l && t.push(l), e.style?.tblOverlap && t.push(`<w:tblOverlap w:val="${oo(e.style.tblOverlap)}"/>`), e.style?.revision) {
			const r = e.style.revision, n = Po({
				...e,
				style: r.previous
			});
			t.push(`<w:tblPrChange ${xo(r)}>${n}</w:tblPrChange>`);
		}
		return `<w:tblPr>${t.join("")}</w:tblPr>`;
	}
	function Fo(e, t, r) {
		if (!e && !t && !r) return "";
		const n = [];
		void 0 !== e?.width && n.push(ko(e.width)), e?.align && n.push(`<w:jc w:val="${e.align}"/>`);
		const o = No("tblCellSpacing", e?.cellSpacing);
		o && n.push(o);
		const i = No("tblInd", e?.indentLeft);
		i && n.push(i);
		const a = e ? Do(e) : "";
		a && n.push(a), e?.layout && n.push(`<w:tblLayout w:type="${e.layout}"/>`);
		const s = To(e?.defaultCellMargins);
		if (s && n.push(s), r) n.push(r);
		else if (t) {
			const e = Fo(t.previous) || "<w:tblPrEx/>";
			n.push(`<w:tblPrExChange ${xo(t)}>${e}</w:tblPrExChange>`);
		}
		return n.length > 0 ? `<w:tblPrEx>${n.join("")}</w:tblPrEx>` : "";
	}
	function Mo(e, t) {
		const r = function(e) {
			const t = [], r = [];
			for (let n = 0; n < e.rows.length; n += 1) {
				const o = e.rows[n];
				if (o.style?.hidden) continue;
				let i = Math.max(0, Math.floor(o.style?.gridBefore ?? 0));
				for (let e = 0; e < o.cells.length; e += 1) {
					for (; t[i] > 0;) i += 1;
					const a = o.cells[e];
					if ("continue" === a.vMerge) continue;
					const s = Math.max(1, a.colSpan ?? 1), l = Math.max(1, a.rowSpan ?? 1);
					r.push({
						rowIndex: n,
						cellIndex: e,
						visualRowIndex: n,
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
			if (e.style?.bidiVisual && r.length > 0) {
				const e = Math.max(...r.map((e) => e.visualColumnIndex + e.colSpan));
				for (const t of r) t.visualColumnIndex = e - t.visualColumnIndex - t.colSpan;
			}
			return r;
		}(e), n = new Map(r.map((e) => [`${e.rowIndex}:${e.cellIndex}`, e])), o = e.rows.map((r, o) => {
			const i = r.cells.map((r, i) => {
				const a = n.get(`${o}:${i}`), s = a && e.gridCols ? e.gridCols.slice(a.visualColumnIndex, a.visualColumnIndex + Math.max(1, a.colSpan)).reduce((e, t) => e + t, 0) : void 0, l = (r.blocks.length > 0 ? r.blocks : [{
					id: "",
					type: "paragraph",
					runs: [{
						id: "",
						text: "",
						kind: "text"
					}]
				}]).map((e) => t(e, r)).join(""), c = "continue" === r.vMerge ? "<w:p/>" : l;
				return `<w:tc${yo(r.extAttributes)}>${Io(r, s)}${c}</w:tc>`;
			}).join("");
			return `<w:tr${yo(r.extAttributes)}>${Fo(r.propertyExceptions, r.propertyExceptionsRevision, r.tblPrExChangeXml)}${$o(r)}${i}</w:tr>`;
		}).join(""), i = e.gridCols ? `<w:tblGrid>${e.gridCols.map((e) => `<w:gridCol w:w="${so(e) ?? 0}"/>`).join("")}${e.gridRevision ? `<w:tblGridChange ${xo(e.gridRevision)}><w:tblGrid>${e.gridRevision.previous.map((e) => `<w:gridCol w:w="${so(e) ?? 0}"/>`).join("")}</w:tblGrid></w:tblGridChange>` : ""}</w:tblGrid>` : "";
		return `<w:tbl>${Po(e)}${i}${o}</w:tbl>`;
	}
	const Oo = "xmlns:w15=\"http://schemas.microsoft.com/office/word/2012/wordml\"";
	function Lo(e) {
		if (!(void 0 !== e.alias || void 0 !== e.tag || void 0 !== e.id || void 0 !== e.lock || void 0 !== e.appearance || void 0 !== e.showingPlcHdr || void 0 !== e.temporary || void 0 !== e.color || void 0 !== e.placeholderDocPart || void 0 !== e.dataBinding || void 0 !== e.subtype || void 0 !== e.repeatingSectionProperties || (e.unknownXml ?? "").length > 0)) return "<w:sdtPr/>";
		let t = "";
		return void 0 !== e.alias && (t += `<w:alias w:val="${oo(e.alias)}"/>`), void 0 !== e.tag && (t += `<w:tag w:val="${oo(e.tag)}"/>`), void 0 !== e.id && (t += `<w:id w:val="${oo(e.id)}"/>`), void 0 !== e.lock && (t += `<w:lock w:val="${oo(e.lock)}"/>`), void 0 !== e.placeholderDocPart && (t += `<w:placeholder><w:docPart w:val="${oo(e.placeholderDocPart)}"/></w:placeholder>`), void 0 !== e.dataBinding && (t += function(e) {
			const t = [];
			void 0 !== e.prefixMappings && t.push(`w:prefixMappings="${oo(e.prefixMappings)}"`);
			void 0 !== e.xpath && t.push(`w:xpath="${oo(e.xpath)}"`);
			void 0 !== e.storeItemID && t.push(`w:storeItemID="${oo(e.storeItemID)}"`);
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
					void 0 !== e?.sectionTitle && (t += `<w15:sectionTitle w15:val="${oo(e.sectionTitle)}"/>`);
					void 0 !== e?.doNotAllowInsertDeleteSection && (t += `<w15:doNotAllowInsertDeleteSection w15:val="${e.doNotAllowInsertDeleteSection ? "1" : "0"}"/>`);
					return t ? `<w15:repeatingSection ${Oo}>${t}</w15:repeatingSection>` : `<w15:repeatingSection ${Oo}/>`;
				}(t);
				case "repeatingSectionItem": return `<w15:repeatingSectionItem ${Oo}/>`;
				case "comboBox":
				case "dropDownList": {
					const t = (e.listItems ?? []).map(Bo).join(""), r = void 0 !== e.lastSelectedValue ? `<w:lastSelectedValue w:val="${oo(e.lastSelectedValue)}"/>` : "";
					return `<w:${e.kind}>${t}${r}</w:${e.kind}>`;
				}
				case "date": {
					const t = void 0 !== e.fullDate ? ` w:fullDate="${oo(e.fullDate)}"` : "";
					let r = "";
					return void 0 !== e.dateFormat && (r += `<w:dateFormat w:val="${oo(e.dateFormat)}"/>`), void 0 !== e.lid && (r += `<w:lid w:val="${oo(e.lid)}"/>`), void 0 !== e.calendar && (r += `<w:calendar w:val="${oo(e.calendar)}"/>`), void 0 !== e.storeMappedDataAs && (r += `<w:storeMappedDataAs w:val="${oo(e.storeMappedDataAs)}"/>`), `<w:date${t}>${r}</w:date>`;
				}
				case "checkbox": {
					let t = "";
					if (void 0 !== e.checked && (t += `<w14:checked w14:val="${e.checked ? "1" : "0"}"/>`), void 0 !== e.checkedStateFont || void 0 !== e.checkedStateChar) t += `<w14:checkedState${void 0 !== e.checkedStateFont ? ` w14:font="${oo(e.checkedStateFont)}"` : ""}${void 0 !== e.checkedStateChar ? ` w14:char="${oo(e.checkedStateChar)}"` : ""}/>`;
					if (void 0 !== e.uncheckedStateFont || void 0 !== e.uncheckedStateChar) t += `<w14:uncheckedState${void 0 !== e.uncheckedStateFont ? ` w14:font="${oo(e.uncheckedStateFont)}"` : ""}${void 0 !== e.uncheckedStateChar ? ` w14:char="${oo(e.uncheckedStateChar)}"` : ""}/>`;
					return `<w14:checkbox>${t}</w14:checkbox>`;
				}
				default: return e;
			}
		}(e.subtype, e.repeatingSectionProperties)), void 0 !== e.appearance && (t += `<w:appearance w:val="${oo(e.appearance)}"/>`), void 0 !== e.showingPlcHdr && (t += `<w:showingPlcHdr w:val="${e.showingPlcHdr ? "true" : "false"}"/>`), void 0 !== e.color && (t += `<w:color w:val="${oo(e.color)}"/>`), e.unknownXml && (t += e.unknownXml), `<w:sdtPr>${t}</w:sdtPr>`;
	}
	function Bo(e) {
		return `<w:listItem${void 0 !== e.displayText ? ` w:displayText="${oo(e.displayText)}"` : ""}${void 0 !== e.value ? ` w:value="${oo(e.value)}"` : ""}/>`;
	}
	function Uo(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType === o.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && o.localName === t && r.push(o);
		}
		return r;
	}
	function zo(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">${e}</oasis:root>`, "application/xml").documentElement;
		if (r) for (let n = 0; n < r.childNodes.length; n += 1) {
			const e = r.childNodes[n];
			if (e?.nodeType === e.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) return e;
		}
	}
	function Ho(e, t) {
		const r = e.ownerDocument;
		if (!r) return null;
		const n = r.createElementNS(eo, "w:sdt"), o = zo(Lo(t.sdtPr), "sdtPr");
		if (o && n.appendChild(o.cloneNode(!0)), t.sdtEndPrXml) {
			const e = zo(t.sdtEndPrXml, "sdtEndPr");
			e && n.appendChild(e.cloneNode(!0));
		}
		const i = r.createElementNS(eo, "w:sdtContent");
		return n.appendChild(i), {
			sdt: n,
			content: i
		};
	}
	function jo(e, t) {
		let r = 0;
		for (; r < t.length;) {
			const n = t[r].wrappers[0];
			if (!n) {
				r += 1;
				continue;
			}
			let o = r + 1;
			for (; o < t.length && t[o].wrappers[0]?.groupId === n.groupId;) o += 1;
			const i = Ho(e, n);
			if (!i) {
				r = o;
				continue;
			}
			e.insertBefore(i.sdt, t[r].element);
			const a = [];
			for (let e = r; e < o; e += 1) {
				const r = t[e];
				i.content.appendChild(r.element), a.push({
					element: r.element,
					wrappers: r.wrappers.slice(1)
				});
			}
			jo(i.content, a), r = o;
		}
	}
	function qo(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Wo(e) {
		return `${e.namespaceURI ?? ""}\0${function(e) {
			return e.localName ?? e.tagName;
		}(e)}`;
	}
	function Go(e, t, r) {
		const n = Wo(e[t]);
		let o = 0;
		for (let i = 0; i < t; i += 1) Wo(e[i]) === n && (o += 1);
		return r.filter((e) => Wo(e) === n)[o];
	}
	function Vo(e, t) {
		(function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				if (!n || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		})(e, t);
		const r = qo(e), n = qo(t);
		r.forEach((e, o) => {
			const i = Go(r, o, n);
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI) return void (i && Vo(e, i));
			if (i) return void Vo(e, i);
			const a = r.slice(o + 1).map((e, t) => Go(r, o + t + 1, n)).find((e) => Boolean(e));
			t.insertBefore(e.cloneNode(!0), a ?? null);
		});
	}
	const Xo = /* @__PURE__ */ new Set([
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
	]), Zo = /* @__PURE__ */ new Set(["gridCol", "tblGridChange"]), Yo = /* @__PURE__ */ new Set([
		"tblW",
		"jc",
		"tblCellSpacing",
		"tblInd",
		"tblBorders",
		"tblLayout",
		"tblCellMar",
		"tblPrExChange"
	]), Qo = /* @__PURE__ */ new Set([
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
	]), Ko = /* @__PURE__ */ new Set([
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
	function Jo(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function ei(e) {
		return e.localName ?? e.tagName;
	}
	function ti(e) {
		return `${e.namespaceURI ?? ""}\0${ei(e)}`;
	}
	function ri(e, t) {
		const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r?.namespaceURI && ei(r) === t ? r : void 0;
	}
	function ni(e, t, r, n, o) {
		if (!e || function(e) {
			return Boolean(e && jr(e.xml));
		}(e)) return t;
		if (e.semanticSignature === o) return e.xml;
		const i = ri(e.xml, r), a = function(e, t) {
			if (e) {
				const r = ri(e, t);
				if (r) return r;
			}
			return new b.DOMParser().parseFromString(`<w:${t} xmlns:w="${eo}"/>`, "application/xml").documentElement;
		}(t, r);
		if (!i || !a) return t;
		(function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes.item(r);
				if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		})(i, a);
		const s = Jo(i), l = Jo(a), c = /* @__PURE__ */ new Map();
		for (const f of l) {
			const e = ti(f), t = c.get(e) ?? [];
			t.push(f), c.set(e, t);
		}
		const u = /* @__PURE__ */ new Map();
		for (const f of s) {
			const e = ti(f), t = u.get(e) ?? 0;
			u.set(e, t + 1);
			const r = c.get(e)?.[t];
			r && Vo(f, r);
		}
		const d = new Set(l.map(ti)), p = s.filter((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && n.has(ei(e)) || d.has(ti(e))));
		for (const f of p) {
			const e = s.indexOf(f), t = s.slice(e + 1).find((e) => d.has(ti(e))), r = t ? Jo(a).find((e) => ti(e) === ti(t)) ?? null : null;
			a.insertBefore(f.cloneNode(!0), r);
		}
		return t || function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const r = e.attributes.item(t);
				if (r && "http://www.w3.org/2000/xmlns/" !== r.namespaceURI) return !0;
			}
			return !1;
		}(a) || 0 !== Jo(a).length ? new b.XMLSerializer().serializeToString(a) : "";
	}
	function oi(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function ii(e, t) {
		return oi(e).filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t);
	}
	function ai(e, t) {
		return ii(e, t)[0];
	}
	function si(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}">${e}</oasis:root>`, "application/xml").documentElement;
		if (r) return r ? oi(r).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) : void 0;
	}
	function li(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : "";
	}
	function ci(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function ui(e) {
		const t = /* @__PURE__ */ new Map();
		let r = 0;
		for (const n of e) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && ("tblPr" === n.localName || "tblGrid" === n.localName ? t.set(n, n.localName) : "tr" === n.localName && (t.set(n, `tr:${r}`), r += 1));
		return t;
	}
	function di(e, t, r, n, o) {
		if (!r) return void (t && e.removeChild(t));
		const i = si(r, n);
		i && (t ? e.replaceChild(i.cloneNode(!0), t) : e.insertBefore(i.cloneNode(!0), o));
	}
	function pi(e, t) {
		const r = ai(t, "tblPr"), n = ai(t, "tblGrid"), o = ai(t, "tr") ?? null;
		di(t, r, function(e, t) {
			return ni(cn(e)?.tableProperties, t, "tblPr", Xo, tn(e));
		}(e, li(r)), "tblPr", n ?? o);
		const i = ai(t, "tblGrid");
		di(t, i, function(e, t) {
			return ni(cn(e)?.tableGrid, t, "tblGrid", Zo, rn(e));
		}(e, li(i)), "tblGrid", ai(t, "tr") ?? null);
	}
	function fi(e, t) {
		const r = ii(t, "tr");
		r.length === e.rows.length && r.forEach((t, r) => {
			const n = e.rows[r], o = ai(t, "tblPrEx"), i = ai(t, "trPr"), a = ai(t, "tc") ?? null;
			di(t, o, function(e, t) {
				return ni(sn(e)?.propertyExceptions, t, "tblPrEx", Yo, on(e));
			}(n, li(o)), "tblPrEx", i ?? a);
			const s = ai(t, "trPr");
			var l;
			di(t, s, (l = function(e, t) {
				return ni(sn(e)?.rowProperties, t, "trPr", Qo, nn(e));
			}(n, li(s)), l.replace(/(<w:jc\b[^>]*\bw:val=")(?<value>start|end)("[^>]*\/?>)/g, (e, t, r, n) => `${t}${"start" === r ? "left" : "right"}${n}`)), "trPr", ai(t, "tc") ?? null);
			const c = ii(t, "tc");
			c.length === n.cells.length && c.forEach((e, t) => {
				const r = n.cells[t], o = ai(e, "tcPr");
				di(e, o, function(e, t) {
					return ni(function(e) {
						return e.ooxmlSource;
					}(e)?.cellProperties, t, "tcPr", Ko, an(e));
				}(r, li(o)), "tcPr", ai(e, "p") ?? ai(e, "tbl") ?? null);
			});
		});
	}
	function hi(e) {
		for (const t of ii(e, "tr")) for (const e of ii(t, "tc")) {
			for (const n of ii(e, "tbl")) hi(n);
			const t = oi(e), r = t[t.length - 1];
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r?.namespaceURI && "tbl" === r.localName) {
				const t = e.ownerDocument;
				t && e.appendChild(t.createElementNS(eo, "w:p"));
			}
		}
	}
	function mi(e, t) {
		const r = Mo(e, t), n = si(r, "tbl");
		return n ? (function(e, t) {
			const r = cn(e)?.xml;
			if (!r) return;
			const n = si(r, "tbl");
			if (!n) return;
			(function(e, t) {
				for (let r = 0; r < e.attributes.length; r += 1) {
					const n = e.attributes.item(r);
					if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
					const o = n.localName ?? n.name;
					(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
				}
			})(n, t);
			const o = oi(n), i = oi(t), a = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName), s = i.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName);
			if (a.length !== s.length) return;
			const l = ui(o), c = new Map([...ui(i)].map(([e, t]) => [t, e]));
			for (let u = 0; u < o.length; u += 1) {
				const e = o[u];
				if (l.has(e)) continue;
				if (ci(li(e))) continue;
				const r = o.slice(u + 1).map((e) => l.get(e)).find((e) => Boolean(e)), n = r ? c.get(r) ?? null : null;
				t.insertBefore(e.cloneNode(!0), n);
			}
		}(e, n), pi(e, n), fi(e, n), hi(n), function(e, t) {
			const r = Uo(t, "tr");
			if (r.length === e.rows.length) {
				for (let t = 0; t < r.length; t += 1) {
					const n = r[t], o = e.rows[t], i = Uo(n, "tc");
					i.length === o.cells.length && jo(n, i.map((e, t) => ({
						element: e,
						wrappers: o.cells[t].sdtWrappers ?? []
					})));
				}
				jo(t, r.map((t, r) => ({
					element: t,
					wrappers: e.rows[r].sdtWrappers ?? []
				})));
			}
		}(e, n), new b.XMLSerializer().serializeToString(n).replace(`<w:tbl xmlns:w="${eo}"`, "<w:tbl")) : r;
	}
	const gi = `xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"`;
	function wi(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function bi(e, t, r) {
		const n = e.ownerDocument;
		if (!n) return;
		const o = n.createElementNS(eo, `w:${r}`);
		for (let i = 0; i < t.attributes.length; i += 1) {
			const e = t.attributes.item(i);
			e && (e.namespaceURI ? o.setAttributeNS(e.namespaceURI, e.name, e.value) : o.setAttribute(e.name, e.value));
		}
		for (; t.firstChild;) o.appendChild(t.firstChild);
		e.replaceChild(o, t);
	}
	function vi(e) {
		const t = function(e) {
			const t = new b.DOMParser().parseFromString(`<oasis:root ${gi}>${e}</oasis:root>`, "application/xml").documentElement;
			if (!t) return;
			const r = wi(t);
			if (1 !== r.length) return;
			const n = r[0];
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && "r" === n.localName ? n : void 0;
		}(e);
		if (!t) return e;
		const r = wi(t), n = r.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "t" === e.localName);
		if (n.length > 0) {
			for (const e of r) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delText" === e.localName && t.removeChild(e);
			for (const e of n) bi(t, e, "delText");
		}
		const o = wi(t), i = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "instrText" === e.localName);
		if (i.length > 0) {
			for (const e of o) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delInstrText" === e.localName && t.removeChild(e);
			for (const e of i) bi(t, e, "delInstrText");
		}
		return new b.XMLSerializer().serializeToString(t);
	}
	function yi(e) {
		return /^\d+$/.test(e) ? e : String(Array.from(e).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0));
	}
	function xi(e) {
		const t = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${yi(e.id)}" w:author="${oo(e.author)}" w:date="${t}"`;
	}
	function Ei(e) {
		if (!e || 0 === e.length) return "";
		const t = e.map((e) => {
			const t = so(e.position);
			if (null === t) return "";
			const r = [`w:val="${e.type}"`, `w:pos="${t}"`];
			return e.leader && "none" !== e.leader ? r.push(`w:leader="${e.leader}"`) : "none" === e.leader && r.push("w:leader=\"none\""), `<w:tab ${r.join(" ")}/>`;
		}).filter(Boolean);
		return t.length > 0 ? `<w:tabs>${t.join("")}</w:tabs>` : "";
	}
	function Si(e) {
		const t = [];
		e.framePrXml && t.push(e.framePrXml), e.suppressLineNumbers && t.push("<w:suppressLineNumbers/>"), e.suppressAutoHyphens && t.push("<w:suppressAutoHyphens/>"), e.bidi && t.push("<w:bidi/>"), !1 === e.kinsoku && t.push("<w:kinsoku w:val=\"0\"/>"), !1 === e.wordWrap && t.push("<w:wordWrap w:val=\"0\"/>"), !1 === e.overflowPunct && t.push("<w:overflowPunct w:val=\"0\"/>"), e.topLinePunct && t.push("<w:topLinePunct/>"), !1 === e.autoSpaceDE && t.push("<w:autoSpaceDE w:val=\"0\"/>"), !1 === e.autoSpaceDN && t.push("<w:autoSpaceDN w:val=\"0\"/>"), !1 === e.adjustRightInd && t.push("<w:adjustRightInd w:val=\"0\"/>"), e.textAlignment && t.push(`<w:textAlignment w:val="${e.textAlignment}"/>`), e.textboxTightWrap && t.push(`<w:textboxTightWrap w:val="${e.textboxTightWrap}"/>`), null != e.divId && t.push(`<w:divId w:val="${e.divId}"/>`);
		const r = (n = e.conditionalStyle) ? `<w:cnfStyle w:val="${Tt.map(([, e]) => n[e] ? "1" : "0").join("")}"/>` : "";
		var n;
		return r && t.push(r), t;
	}
	function Ni(e) {
		const { propertyRevision: t, styleId: r, ...n } = e.previous, o = _i(n), i = o ? o.slice(7, -8) : "", a = r ? `<w:pStyle w:val="${oo(r)}"/>` : "";
		return `<w:pPrChange ${xi(e)}><w:pPr>${a}${i}</w:pPr></w:pPrChange>`;
	}
	function ki(e) {
		return "justify" === e ? "both" : String(e);
	}
	function _i(e) {
		const t = [];
		if (e.align && t.push(`<w:jc w:val="${ki(e.align)}"/>`), void 0 !== e.spacingBefore || void 0 !== e.spacingAfter || void 0 !== e.lineHeight) {
			const r = [], n = ao(e.spacingBefore), o = ao(e.spacingAfter), i = void 0 !== e.lineHeight && null !== e.lineHeight && Number.isFinite(e.lineHeight), a = "exact" === e.lineRule || "atLeast" === e.lineRule, s = i ? a ? io(e.lineHeight, 0) : Math.round(240 * e.lineHeight) : null;
			null !== n && r.push(`w:before="${n}"`), null !== o && r.push(`w:after="${o}"`), null !== s && r.push(`w:line="${s}"`), null !== s && a && r.push(`w:lineRule="${e.lineRule}"`), r.length > 0 && t.push(`<w:spacing ${r.join(" ")}/>`);
		}
		if (void 0 !== e.indentLeft || void 0 !== e.indentRight || void 0 !== e.indentFirstLine || void 0 !== e.indentHanging) {
			const r = [], n = ao(e.indentLeft), o = ao(e.indentRight), i = ao(e.indentFirstLine), a = ao(e.indentHanging);
			null !== n && r.push(`w:left="${n}"`), null !== o && r.push(`w:right="${o}"`), null !== i && r.push(`w:firstLine="${i}"`), null !== a && r.push(`w:hanging="${a}"`), r.length > 0 && t.push(`<w:ind ${r.join(" ")}/>`);
		}
		const r = Ei(e.tabs);
		r && t.push(r), e.pageBreakBefore && t.push("<w:pageBreakBefore/>"), e.keepWithNext && t.push("<w:keepNext/>"), e.keepLinesTogether && t.push("<w:keepLines/>"), !1 === e.widowControl && t.push("<w:widowControl w:val=\"0\"/>"), e.contextualSpacing && t.push("<w:contextualSpacing/>"), e.mirrorIndents && t.push("<w:mirrorIndents/>");
		const n = bo(e);
		return n && t.push(n), e.shading && t.push(co(e.shading)), e.textDirection && t.push(`<w:textDirection w:val="${e.textDirection}"/>`), null != e.outlineLevel && t.push(`<w:outlineLvl w:val="${e.outlineLevel}"/>`), t.push(...Si(e)), e.propertyRevision && t.push(Ni(e.propertyRevision)), t.length > 0 ? `<w:pPr>${t.join("")}</w:pPr>` : "";
	}
	function Ti(e, t, r, n) {
		const o = [], i = function(e, t) {
			const r = ie(e.style, t);
			return {
				align: r.align,
				spacingBefore: r.spacingBefore,
				spacingAfter: r.spacingAfter,
				contextualSpacing: r.contextualSpacing,
				lineHeight: r.lineHeight,
				lineRule: r.lineRule,
				indentLeft: r.indentLeft,
				indentRight: r.indentRight,
				indentFirstLine: r.indentFirstLine,
				indentHanging: r.indentHanging,
				mirrorIndents: r.mirrorIndents,
				pageBreakBefore: r.pageBreakBefore,
				keepWithNext: r.keepWithNext,
				keepLinesTogether: r.keepLinesTogether,
				widowControl: r.widowControl,
				shading: r.shading,
				borderTop: r.borderTop,
				borderRight: r.borderRight,
				borderBottom: r.borderBottom,
				borderLeft: r.borderLeft,
				tabs: r.tabs,
				textDirection: r.textDirection,
				outlineLevel: r.outlineLevel,
				suppressLineNumbers: r.suppressLineNumbers,
				suppressAutoHyphens: r.suppressAutoHyphens,
				bidi: r.bidi,
				kinsoku: r.kinsoku,
				wordWrap: r.wordWrap,
				overflowPunct: r.overflowPunct,
				topLinePunct: r.topLinePunct,
				autoSpaceDE: r.autoSpaceDE,
				autoSpaceDN: r.autoSpaceDN,
				adjustRightInd: r.adjustRightInd,
				textAlignment: r.textAlignment,
				textboxTightWrap: r.textboxTightWrap,
				divId: r.divId,
				conditionalStyle: r.conditionalStyle,
				borderBetween: r.borderBetween,
				borderBar: r.borderBar,
				framePrXml: r.framePrXml,
				propertyRevision: e.style?.propertyRevision
			};
		}(e, r), a = e.style?.align ?? n?.align ?? i.align;
		if (e.style?.styleId && o.push(`<w:pStyle w:val="${oo(e.style.styleId)}"/>`), a && o.push(`<w:jc w:val="${ki(a)}"/>`), void 0 !== i.spacingBefore || void 0 !== i.spacingAfter || void 0 !== i.lineHeight) {
			const e = [], t = ao(i.spacingBefore), r = ao(i.spacingAfter), n = void 0 !== i.lineHeight && null !== i.lineHeight && Number.isFinite(i.lineHeight), a = "exact" === i.lineRule || "atLeast" === i.lineRule, s = n ? a ? io(i.lineHeight, 0) : Math.round(240 * i.lineHeight) : null;
			null !== t && e.push(`w:before="${t}"`), null !== r && e.push(`w:after="${r}"`), null !== s && e.push(`w:line="${s}"`), null !== s && a && e.push(`w:lineRule="${i.lineRule}"`), e.length > 0 && o.push(`<w:spacing ${e.join(" ")}/>`);
		}
		if (void 0 !== i.indentLeft || void 0 !== i.indentRight || void 0 !== i.indentFirstLine || void 0 !== i.indentHanging) {
			const e = [], t = ao(i.indentLeft), r = ao(i.indentRight), n = ao(i.indentFirstLine), a = ao(i.indentHanging);
			null !== t && e.push(`w:left="${t}"`), null !== r && e.push(`w:right="${r}"`), null !== n && e.push(`w:firstLine="${n}"`), null !== a && e.push(`w:hanging="${a}"`), e.length > 0 && o.push(`<w:ind ${e.join(" ")}/>`);
		}
		const s = Ei(i.tabs);
		s && o.push(s), i.pageBreakBefore && o.push("<w:pageBreakBefore/>"), i.keepWithNext && o.push("<w:keepNext/>"), i.keepLinesTogether && o.push("<w:keepLines/>"), !1 === i.widowControl && o.push("<w:widowControl w:val=\"0\"/>"), i.contextualSpacing && o.push("<w:contextualSpacing/>"), i.mirrorIndents && o.push("<w:mirrorIndents/>");
		const l = bo(i);
		l && o.push(l), i.shading && o.push(co(i.shading)), i.textDirection && o.push(`<w:textDirection w:val="${i.textDirection}"/>`), null != i.outlineLevel && o.push(`<w:outlineLvl w:val="${i.outlineLevel}"/>`), o.push(...Si(i));
		const c = t.get(e.id), u = e.numberingRevision ? `<w:numberingChange ${xi(e.numberingRevision)}${void 0 !== e.numberingRevision.original ? ` w:original="${oo(e.numberingRevision.original)}"` : ""}/>` : "";
		if (c || u) {
			const e = c ? `<w:ilvl w:val="${c.level}"/><w:numId w:val="${c.numId}"/>` : "";
			o.push(`<w:numPr>${e}${u}</w:numPr>`);
		}
		return e.style?.propertyRevision && o.push(Ni(e.style.propertyRevision)), o.length > 0 ? `<w:pPr>${o.join("")}</w:pPr>` : "";
	}
	const Ii = {
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
	}, Ai = {
		ffff00: "yellow",
		fef08a: "yellow",
		ff0000: "red",
		"00ff00": "green",
		"0000ff": "blue",
		"00ffff": "cyan",
		ff00ff: "magenta",
		"000000": "black",
		ffffff: "white"
	}, Ci = "http://schemas.openxmlformats.org/markup-compatibility/2006";
	function Ri(e) {
		return `<w14:solidFill><w14:srgbClr w14:val="${lo(e)}"/></w14:solidFill>`;
	}
	function $i(e) {
		return "solid" === e.type ? Ri(e.color) : `<w14:gradFill><w14:gsLst>${e.stops.map((e) => {
			const t = lo(e.color);
			return `<w14:gs w14:pos="${Math.round(e.position * R)}"><w14:srgbClr w14:val="${t}">${void 0 !== e.alpha ? `<w14:alpha w14:val="${Math.round(e.alpha * R)}"/>` : ""}</w14:srgbClr></w14:gs>`;
		}).join("")}</w14:gsLst><w14:lin w14:ang="${Math.round((e.angle ?? 0) * $)}" w14:scaled="0"/></w14:gradFill>`;
	}
	function Di(e, t) {
		return `<w14:srgbClr w14:val="${lo(e)}">${void 0 !== t ? `<w14:alpha w14:val="${Math.round(t * R)}"/>` : ""}</w14:srgbClr>`;
	}
	function Pi(e) {
		return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14">${e}</mc:Choice><mc:Fallback/></mc:AlternateContent>`;
	}
	function Fi(e) {
		return null != e && Number.isFinite(e) ? Math.round(20 * e) : null;
	}
	const Mi = function(e) {
		if (!e) return null;
		const t = hr(e);
		return fr.test(t) ? [
			Number.parseInt(t.slice(0, 2), 16),
			Number.parseInt(t.slice(2, 4), 16),
			Number.parseInt(t.slice(4, 6), 16)
		] : null;
	};
	function Oi(e) {
		if (!e) return "";
		const t = [];
		e.styleId && t.push(`<w:rStyle w:val="${oo(e.styleId)}"/>`);
		const r = (e, ...r) => {
			if (null != e) for (const n of r) t.push(e ? `<w:${n}/>` : `<w:${n} w:val="0"/>`);
		};
		if (r(e.bold, "b", "bCs"), r(e.italic, "i", "iCs"), e.underline) {
			const r = e.underlineStyle ?? "single", n = e.underlineColor ? ` w:color="${lo(e.underlineColor, "auto")}"` : "";
			t.push(`<w:u w:val="${oo(r)}"${n}/>`);
		} else !1 === e.underline && t.push("<w:u w:val=\"none\"/>");
		if (r(e.strike, "strike"), r(e.doubleStrike, "dstrike"), r(e.outline, "outline"), r(e.shadow, "shadow"), r(e.emboss, "emboss"), r(e.imprint, "imprint"), r(e.smallCaps, "smallCaps"), r(e.allCaps, "caps"), r(e.hidden, "vanish"), r(e.noProof, "noProof"), r(e.webHidden, "webHidden"), r(e.specVanish, "specVanish"), !1 === e.snapToGrid && t.push("<w:snapToGrid w:val=\"0\"/>"), e.textEffect && t.push(`<w:effect w:val="${oo(e.textEffect)}"/>`), e.textBorder && t.push(`<w:bdr ${wo(e.textBorder)}`), void 0 !== e.characterScale && null !== e.characterScale && Number.isFinite(e.characterScale) && t.push(`<w:w w:val="${Math.max(1, Math.round(e.characterScale))}"/>`), void 0 !== e.characterSpacing && null !== e.characterSpacing) {
			const r = Fi(e.characterSpacing);
			null !== r && t.push(`<w:spacing w:val="${r}"/>`);
		}
		void 0 !== e.baselineShift && null !== e.baselineShift && Number.isFinite(e.baselineShift) && t.push(`<w:position w:val="${Math.round(2 * e.baselineShift)}"/>`), void 0 !== e.kerningThreshold && null !== e.kerningThreshold && Number.isFinite(e.kerningThreshold) && t.push(`<w:kern w:val="${Math.max(0, Math.round(2 * e.kerningThreshold))}"/>`);
		const n = function(e) {
			switch (e) {
				case "none": return "none";
				case "standard": return "standard";
				case "contextual": return "contextual";
				case "historical": return "historical";
				case "standardContextual": return "standardContextual";
				default: return null;
			}
		}(e.ligatures);
		n && t.push(`<w14:ligatures w14:val="${n}"/>`);
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
		if (a && t.push(`<w14:stylisticSets w14:val="${a}"/>`), void 0 !== e.contextualAlternates && t.push(`<w14:cntxtAlts w14:val="${e.contextualAlternates ? 1 : 0}"/>`), e.superscript ? t.push("<w:vertAlign w:val=\"superscript\"/>") : e.subscript ? t.push("<w:vertAlign w:val=\"subscript\"/>") : !1 !== e.superscript && !1 !== e.subscript || t.push("<w:vertAlign w:val=\"baseline\"/>"), e.fontFamily && t.push(`<w:rFonts w:ascii="${oo(e.fontFamily)}" w:hAnsi="${oo(e.fontFamily)}" w:cs="${oo(e.fontFamily)}"/>`), void 0 !== e.fontSize && null !== e.fontSize) {
			const r = function(e) {
				return null != e && Number.isFinite(e) ? Math.round(e / 96 * 72 * 2) : null;
			}(e.fontSize);
			null !== r && t.push(`<w:sz w:val="${r}"/>`, `<w:szCs w:val="${r}"/>`);
		}
		if (e.textFill) {
			const r = "solid" === e.textFill.type ? e.textFill.color : e.color;
			t.push(function(e, t) {
				const r = $i(e), n = lo(t ?? "000000");
				return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14"><w14:textFill>${r}</w14:textFill></mc:Choice><mc:Fallback><w:color w:val="${n}"/></mc:Fallback></mc:AlternateContent>`;
			}(e.textFill, r ?? null));
		} else e.color && t.push(`<w:color w:val="${lo(e.color, "auto")}"/>`);
		if (e.textOutline && t.push(function(e) {
			const t = Math.round(Math.max(0, e.widthPt) * A), r = e.fill ? $i(e.fill) : e.color ? Ri(e.color) : "";
			return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14"><w14:textOutline w14:w="${t}" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">` + r + "</w14:textOutline></mc:Choice><mc:Fallback><w:outline/></mc:Fallback></mc:AlternateContent>";
		}(e.textOutline)), e.textShadow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * A), r = Math.round(Math.max(0, e.distPt) * A), n = Math.round(e.dirDeg * $), o = Di(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14"><w14:shadow w14:blurRad="${t}" w14:dist="${r}" w14:dir="${n}" w14:sx="100000" w14:sy="100000" w14:kx="0" w14:ky="0" w14:algn="ctr">` + o + "</w14:shadow></mc:Choice><mc:Fallback><w:shadow/></mc:Fallback></mc:AlternateContent>";
		}(e.textShadow)), e.glow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.radiusPt) * A), r = Di(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14"><w14:glow w14:rad="${t}">${r}</w14:glow></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.glow)), e.reflection && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * A), r = Math.round(e.startAlpha * R), n = Math.round(e.startPos * R), o = Math.round(e.endAlpha * R), i = Math.round(e.endPos * R), a = Math.round(Math.max(0, e.distPt) * A);
			return `<mc:AlternateContent xmlns:mc="${Ci}"><mc:Choice Requires="w14"><w14:reflection w14:blurRad="${t}" w14:stA="${r}" w14:stPos="${n}" w14:endA="${o}" w14:endPos="${i}" w14:dist="${a}" w14:dir="5400000" w14:fadeDir="5400000" w14:sx="100000" w14:sy="-100000" w14:kx="0" w14:ky="0" w14:algn="bl"/></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.reflection)), e.scene3dXml && t.push(Pi(e.scene3dXml)), e.props3dXml && t.push(Pi(e.props3dXml)), e.highlight && t.push(`<w:highlight w:val="${oo(function(e) {
			if (e in Ii) return e;
			const t = (gr(e) ?? e).trim().replace(/^#/, "").toLowerCase(), r = Ai[t];
			if (r) return r;
			const n = Mi(t);
			if (!n) return "yellow";
			let o = "yellow", i = Number.POSITIVE_INFINITY;
			for (const [a, s] of Object.entries(Ii)) {
				const e = (s[0] - n[0]) ** 2 + (s[1] - n[1]) ** 2 + (s[2] - n[2]) ** 2;
				e < i && (i = e, o = a);
			}
			return o;
		}(e.highlight))}"/>`), e.shading && t.push(co(e.shading)), void 0 !== e.fitText && null !== e.fitText && Number.isFinite(e.fitText)) {
			const r = Fi(e.fitText);
			null !== r && r > 0 && t.push(`<w:fitText w:val="${r}"/>`);
		}
		if (r(e.rtl, "rtl"), r(e.complexScript, "cs"), e.emphasisMark && t.push(`<w:em w:val="${oo(e.emphasisMark)}"/>`), e.language) {
			const r = [];
			e.language.value && r.push(`w:val="${oo(e.language.value)}"`), e.language.eastAsia && r.push(`w:eastAsia="${oo(e.language.eastAsia)}"`), e.language.bidi && r.push(`w:bidi="${oo(e.language.bidi)}"`), r.length > 0 && t.push(`<w:lang ${r.join(" ")}/>`);
		}
		return e.propertyRevision && t.push(function(e) {
			const { propertyRevision: t, styleId: r, ...n } = e.previous, o = Oi(n), i = o ? o.slice(7, -8) : "", a = r ? `<w:rStyle w:val="${oo(r)}"/>` : "";
			return `<w:rPrChange ${xi(e)}><w:rPr>${a}${i}</w:rPr></w:rPrChange>`;
		}(e.propertyRevision)), t.length > 0 ? `<w:rPr>${t.join("")}</w:rPr>` : "";
	}
	function Li(e) {
		return 0 === e.length ? "" : `<w:t${t = e, /^\s|\s$/.test(t) || t.includes("  ") ? " xml:space=\"preserve\"" : ""}>${oo(e)}</w:t>`;
		var t;
	}
	function Bi(e) {
		if (0 === e.length) return "<w:t></w:t>";
		let t = "", r = "";
		for (const n of e) "\n" !== n ? "\v" !== n ? "	" !== n ? "‑" !== n ? "­" !== n ? r += n : (t += Li(r), r = "", t += "<w:softHyphen/>") : (t += Li(r), r = "", t += "<w:noBreakHyphen/>") : (t += Li(r), r = "", t += "<w:tab/>") : (t += Li(r), r = "", t += "<w:br w:type=\"column\"/>") : (t += Li(r), r = "", t += "<w:br/>");
		return t += Li(r), t || "<w:t></w:t>";
	}
	function Ui(e, t) {
		return e ?? t ? "1" : "0";
	}
	function zi(e, t, r) {
		const n = oo(t?.relativeFrom ?? r);
		return t?.align ? `<wp:${e} relativeFrom="${n}"><wp:align>${oo(t.align)}</wp:align></wp:${e}>` : `<wp:${e} relativeFrom="${n}"><wp:posOffset>${t?.offset ?? 0}</wp:posOffset></wp:${e}>`;
	}
	function Hi(e) {
		if (!e || e.length < 3) return "";
		const t = (e) => Math.round(21600 * Math.min(1, Math.max(0, e))), r = (e, r) => `<wp:${r} x="${t(e.x)}" y="${t(e.y)}"/>`, n = e[0];
		return `<wp:wrapPolygon edited="0">${[
			r(n, "start"),
			...e.slice(1).map((e) => r(e, "lineTo")),
			r(n, "lineTo")
		].join("")}</wp:wrapPolygon>`;
	}
	function ji(e) {
		const { cx: t, cy: r, floating: n, docPrId: o, docPrName: i, altAttr: a, graphicXml: s } = e, l = oo(i);
		if (!n) return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${t}" cy="${r}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:inline></w:drawing>`;
		const c = n.distT ?? 0, u = n.distB ?? 0, d = n.distL ?? 0, p = n.distR ?? 0, f = zi("positionH", n.positionH, "column"), h = zi("positionV", n.positionV, "paragraph"), m = function(e, t, r) {
			const n = t && "bothSides" !== t ? ` wrapText="${t}"` : "";
			switch (e) {
				case "square": return `<wp:wrapSquare${n}/>`;
				case "tight": {
					const e = Hi(r);
					return e ? `<wp:wrapTight${n}>${e}</wp:wrapTight>` : `<wp:wrapTight${n}/>`;
				}
				case "through": {
					const e = Hi(r);
					return e ? `<wp:wrapThrough${n}>${e}</wp:wrapThrough>` : `<wp:wrapThrough${n}/>`;
				}
				case "topAndBottom": return "<wp:wrapTopAndBottom/>";
				default: return "<wp:wrapNone/>";
			}
		}(n.wrap, n.wrapText, e.wrapPolygon);
		return `<w:drawing><wp:anchor distT="${c}" distB="${u}" distL="${d}" distR="${p}" simplePos="${Ui(n.simplePos, !1)}" relativeHeight="${n.relativeHeight ?? 0}" behindDoc="${Ui(n.behindDoc, !1)}" locked="${Ui(n.locked, !1)}" layoutInCell="${Ui(n.layoutInCell, !0)}" allowOverlap="${Ui(n.allowOverlap, !0)}"><wp:simplePos x="0" y="0"/>${f}${h}<wp:extent cx="${t}" cy="${r}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${m}<wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:anchor></w:drawing>`;
	}
	function qi(e, t, r, n) {
		const o = r.images.find((e) => e.rId === t);
		if (!o) return null;
		const i = (parseInt(t.replace(/\D+/g, ""), 10) || 0) + 1, a = void 0 !== o.alt ? ` descr="${oo(o.alt)}" title="${oo(o.alt)}"` : "", s = function(e) {
			let t = "";
			if (e.rotation) {
				const r = Math.round(e.rotation * $);
				0 !== r && (t += ` rot="${r}"`);
			}
			return e.flipH && (t += " flipH=\"1\""), e.flipV && (t += " flipV=\"1\""), t;
		}(o), l = function(e) {
			if (!e) return "";
			const t = (e) => e ? Math.round(e * R) : 0, r = t(e.left), n = t(e.top), o = t(e.right), i = t(e.bottom);
			return 0 === r && 0 === n && 0 === o && 0 === i ? "" : `<a:srcRect l="${r}" t="${n}" r="${o}" b="${i}"/>`;
		}(o.crop), c = (u = o.border) ? `<a:ln${void 0 !== u.widthPt ? ` w="${Math.round(u.widthPt * A)}"` : ""}><a:solidFill><a:srgbClr val="${oo(u.color.replace(/^#/, ""))}"/></a:solidFill>${u.dash ? `<a:prstDash val="${u.dash}"/>` : ""}</a:ln>` : "";
		var u;
		const d = "tile" === o.fillMode ? "<a:tile/>" : "<a:stretch><a:fillRect/></a:stretch>", p = "linked" === o.kind ? `r:link="${t}"` : `r:embed="${t}"`, f = void 0 !== o.transparency && o.transparency > 0 ? `<a:alphaModFix amt="${Math.round((1 - Math.max(0, Math.min(1, o.transparency))) * R)}"/>` : "", h = function(e) {
			if (!e) return "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>";
			if (e.rawXml && !e.adjustments) return e.rawXml;
			const t = Object.entries(e.adjustments ?? {}).map(([e, t]) => `<a:gd name="${oo(e)}" fmla="val ${Number.isFinite(t) ? t : 0}"/>`).join(""), r = t ? `<a:avLst>${t}</a:avLst>` : "<a:avLst/>";
			return `<a:prstGeom prst="${oo(e.preset)}">${r}</a:prstGeom>`;
		}(o.cropShape);
		return `<w:r>${n}${function(e, t, r, n) {
			return ji({
				cx: e.cx,
				cy: e.cy,
				floating: e.floating,
				docPrId: t,
				docPrName: "Picture",
				altAttr: r,
				graphicXml: n,
				wrapPolygon: e.wrapPolygon
			});
		}(o, i, a, `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${a}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip ${p} xmlns:r="${ro}">${f}</a:blip>${l}${d}</pic:blipFill><pic:spPr><a:xfrm${s}><a:off x="0" y="0"/><a:ext cx="${o.cx}" cy="${o.cy}"/></a:xfrm>${h}${c}</pic:spPr></pic:pic></a:graphicData></a:graphic>`)}</w:r>`;
	}
	function Wi(e, t, r, n, o, i) {
		const a = Math.round(t.width * I), s = Math.round(t.height * I), l = r.textBoxDocPrIds.get(e.id) ?? 1, c = t.name ?? "Text Box", u = void 0 !== t.alt ? ` descr="${oo(t.alt)}" title="${oo(t.alt)}"` : "", d = function(e, t, r, n, o, i) {
			const a = e.shape, s = oo(a?.preset ?? "rect"), l = e.rotation ? Math.round(e.rotation * $) : 0, c = 0 !== l ? ` rot="${l}"` : "", u = a?.fill ? `<a:solidFill><a:srgbClr val="${oo(a.fill.replace(/^#/, ""))}"/></a:solidFill>` : "";
			let d = "";
			(a?.borderColor || void 0 !== a?.borderWidthPt) && (d = `<a:ln${void 0 !== a?.borderWidthPt ? ` w="${Math.round(a.borderWidthPt * A)}"` : ""}>${a?.borderColor ? `<a:solidFill><a:srgbClr val="${oo(a.borderColor.replace(/^#/, ""))}"/></a:solidFill>` : ""}<a:miter lim="800000"/></a:ln>`);
			const p = e.body, f = ["rot=\"0\"", `vert="${oo(p?.vert ?? "horz")}"`];
			f.push(`wrap="${oo(p?.wrap ?? "square")}"`), void 0 !== p?.paddingLeft && f.push(`lIns="${Math.round(p.paddingLeft * I)}"`), void 0 !== p?.paddingTop && f.push(`tIns="${Math.round(p.paddingTop * I)}"`), void 0 !== p?.paddingRight && f.push(`rIns="${Math.round(p.paddingRight * I)}"`), void 0 !== p?.paddingBottom && f.push(`bIns="${Math.round(p.paddingBottom * I)}"`), f.push(`anchor="${oo(p?.anchor ?? "t")}"`), f.push("anchorCtr=\"0\"");
			const h = p?.autoFit ? "<a:spAutoFit/>" : "", m = e.blocks.length > 0, g = m ? i(e.blocks, n, o) : "";
			return "<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\"><wps:wsp>" + (m ? "<wps:cNvSpPr txBox=\"1\"><a:spLocks noChangeArrowheads=\"1\"/></wps:cNvSpPr>" : "<wps:cNvSpPr/>") + `<wps:spPr bwMode="auto"><a:xfrm${c}><a:off x="0" y="0"/><a:ext cx="${t}" cy="${r}"/></a:xfrm><a:prstGeom prst="${s}"><a:avLst/></a:prstGeom>` + u + d + "</wps:spPr>" + (m ? `<wps:txbx><w:txbxContent>${g}</w:txbxContent></wps:txbx>` : "") + `<wps:bodyPr ${f.join(" ")}>${h}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
		}(t, a, s, r, n, i);
		return `<w:r>${o}${ji({
			cx: a,
			cy: s,
			floating: t.floating,
			docPrId: l,
			docPrName: c,
			altAttr: u,
			graphicXml: d
		})}</w:r>`;
	}
	const Gi = {
		footnote: "FootnoteReference",
		endnote: "EndnoteReference"
	};
	function Vi(e) {
		return `<w:r><w:rPr><w:rStyle w:val="${Gi[e]}"/><w:vertAlign w:val="superscript"/></w:rPr><w:${e}Ref/></w:r>`;
	}
	function Xi(e, t, r, n) {
		if (!t) return null;
		const o = ("footnote" === e ? n.footnoteIdMap : n.endnoteIdMap)?.get(t.noteId);
		if (void 0 === o) return null;
		const i = {
			...r ?? {},
			styleId: Gi[e],
			superscript: !0
		}, a = t.customMark ? " w:customMarkFollows=\"1\"" : "", s = t.customMark ? `<w:t xml:space="preserve">${oo(t.customMark)}</w:t>` : "";
		return `<w:r>${Oi(i)}<w:${e}Reference${a} w:id="${o}"/>${s}</w:r>`;
	}
	function Zi(e, t) {
		return void 0 === t ? "" : ` m:${e}="${oo(String(t))}"`;
	}
	function Yi(e) {
		return e.map(Qi).join("");
	}
	function Qi(e) {
		switch (e.kind) {
			case "text": return function(e) {
				const t = e.style;
				return `<m:r>${t ? `<m:rPr>${t.bold ? "<m:b/>" : ""}${t.italic ? "<m:i/>" : ""}${t.normalText ? "<m:nor/>" : ""}${t.script ? `<m:sty m:val="${oo(t.script)}"/>` : ""}</m:rPr>` : ""}<m:t xml:space="preserve">${oo(e.value)}</m:t></m:r>`;
			}(e);
			case "fraction": return `<m:f>${!1 === e.bar ? "<m:fPr><m:type m:val=\"noBar\"/></m:fPr>" : ""}<m:num>${Yi(e.numerator)}</m:num><m:den>${Yi(e.denominator)}</m:den></m:f>`;
			case "radical": return e.degree ? `<m:rad><m:deg>${Yi(e.degree)}</m:deg><m:e>${Yi(e.radicand)}</m:e></m:rad>` : `<m:rad><m:e>${Yi(e.radicand)}</m:e></m:rad>`;
			case "script": {
				const t = e.subscript && e.superscript ? "sSubSup" : e.subscript ? "sSub" : "sSup";
				return `<m:${t}><m:e>${Yi(e.base)}</m:e>${e.subscript ? `<m:sub>${Yi(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${Yi(e.superscript)}</m:sup>` : ""}</m:${t}>`;
			}
			case "delimiter": return `<m:d><m:dPr>${Zi("begChr", e.begin)}${Zi("endChr", e.end)}${Zi("sepChr", e.separator)}${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:dPr>${e.children.map((e) => `<m:e>${Yi(e)}</m:e>`).join("")}</m:d>`;
			case "accent": return `<m:acc><m:accPr><m:chr${Zi("val", e.accent)}/></m:accPr><m:e>${Yi(e.children)}</m:e></m:acc>`;
			case "nary": return `<m:nary><m:naryPr><m:chr${Zi("val", e.operator)}/>${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:naryPr>${e.subscript ? `<m:sub>${Yi(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${Yi(e.superscript)}</m:sup>` : ""}<m:e>${Yi(e.children)}</m:e></m:nary>`;
			case "limit": return "low" === e.operator ? `<m:limLow><m:e>${Yi(e.base)}</m:e><m:lim>${Yi(e.limit)}</m:lim></m:limLow>` : `<m:limUpp><m:e>${Yi(e.base)}</m:e><m:lim>${Yi(e.limit)}</m:lim></m:limUpp>`;
			case "matrix": return `<m:m>${e.rows.map((e) => `<m:mr>${e.map((e) => `<m:e>${Yi(e)}</m:e>`).join("")}</m:mr>`).join("")}</m:m>`;
			case "box": return `<m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}><m:e>${Yi(e.children)}</m:e></m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}>`;
			case "group": return Yi(e.children);
			case "raw": return e.xml;
		}
	}
	const Ki = "http://schemas.openxmlformats.org/markup-compatibility/2006", Ji = /* @__PURE__ */ new Set([
		"t",
		"tab",
		"br",
		"cr",
		"noBreakHyphen",
		"softHyphen"
	]), ea = /* @__PURE__ */ new Set([
		...Ji,
		"drawing",
		"pict",
		"sym",
		"fldChar",
		"instrText",
		"footnoteReference",
		"endnoteReference",
		"separator",
		"continuationSeparator"
	]), ta = /* @__PURE__ */ new Set([
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
	]), ra = /* @__PURE__ */ new Set([
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
	function na(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function oa(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function ia(e) {
		return e.localName ?? e.tagName;
	}
	function aa(e, t, r) {
		return oa(e).find((e) => e.namespaceURI === t && ia(e) === r);
	}
	function sa(e) {
		return `${e.namespaceURI ?? ""}\0${ia(e)}`;
	}
	function la(e) {
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return t && "r" === ia(t) ? t : void 0;
	}
	function ca(e) {
		const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}" xmlns:w14="${no}" xmlns:r="${ro}" xmlns:mc="${Ki}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!t) return;
		const r = oa(t);
		return 1 === r.length && "r" === ia(r[0]) ? r[0] : void 0;
	}
	function ua(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function da(e) {
		for (let t = 0; t < e.attributes.length; t += 1) {
			const r = e.attributes[t];
			if (r && !ua(r) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== r.namespaceURI) return !0;
		}
		return !1;
	}
	function pa(e) {
		const t = ia(e);
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI ? ta.has(t) : "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI ? ra.has(t) : e.namespaceURI === Ki && "AlternateContent" === t;
	}
	function fa(e, t) {
		const r = aa(e, eo, "rPr");
		if (!r) return;
		const n = oa(r), o = aa(t, eo, "rPr"), i = o ? oa(o) : [], a = new Set(i.map(sa)), s = n.filter((e) => !pa(e) && !a.has(sa(e)));
		if (0 === s.length) return;
		const l = function(e) {
			const t = aa(e, eo, "rPr");
			if (t) return t;
			const r = e.ownerDocument.createElementNS(eo, "w:rPr");
			return e.insertBefore(r, e.firstChild), r;
		}(t);
		for (const c of s) {
			const e = n.indexOf(c), t = n.slice(e + 1).find((e) => a.has(sa(e))), r = t ? oa(l).find((e) => sa(e) === sa(t)) ?? null : null;
			l.insertBefore(c.cloneNode(!0), r);
		}
	}
	function ha(e) {
		const t = ia(e);
		return e.namespaceURI === Ki && "AlternateContent" === t ? function(e) {
			const t = (e) => oa(e).some((e) => {
				const r = ia(e);
				return !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !ea.has(r)) || t(e);
			});
			return t(e);
		}(e) : "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && ("rPr" === t || ea.has(t));
	}
	function ma(e) {
		const t = Yr(e);
		if (t && !na(t.xml) && (r = t.xml, !Br.test(r))) {
			var r;
			if (t.semanticSignature === Vr(e)) return t.xml;
			if (t.structureSignature === Xr(e)) return function(e, t) {
				if ("text" !== e.kind) return;
				const r = la(t);
				if (!r) return;
				const n = oa(r), o = n.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && Ji.has(ia(e))), i = o[0] ?? n.find((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "rPr" === ia(e))) ?? null, a = ca(`<w:r>${Bi(e.text)}</w:r>`);
				if (!a) return;
				const s = oa(a);
				for (const l of s) r.insertBefore(l.cloneNode(!0), i);
				for (const l of o) r.removeChild(l);
				return new b.XMLSerializer().serializeToString(r);
			}(e, t.xml);
		}
	}
	function ga(e, t) {
		const r = Yr(e);
		if (!r || na(r.xml)) return t;
		const n = la(r.xml);
		if (!n || !function(e) {
			if (da(e)) return !0;
			const t = aa(e, eo, "rPr");
			return !(!t || !da(t) && !oa(t).some((e) => !pa(e))) || oa(e).some((e) => !ha(e));
		}(n)) return t;
		const o = ca(t);
		return o ? (function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		}(n, o), fa(n, o), function(e, t) {
			const r = oa(e), n = oa(t), o = new Set(n.map(sa)), i = r.filter((e) => !ha(e) && !o.has(sa(e)));
			for (const a of i) {
				const e = r.indexOf(a), n = r.slice(e + 1).find((e) => ha(e)), o = n ? oa(t).find((e) => sa(e) === sa(n)) ?? null : null;
				t.insertBefore(a.cloneNode(!0), o);
			}
		}(n, o), new b.XMLSerializer().serializeToString(o)) : t;
	}
	function wa(e, t, r, n, o) {
		if (e.revisionRangeMarker) return function(e) {
			const t = `move${"from" === e.move ? "From" : "To"}Range${"start" === e.edge ? "Start" : "End"}`, r = [`w:id="${yi(e.id)}"`];
			return void 0 !== e.displacedByCustomXml && r.push(`w:displacedByCustomXml="${oo(e.displacedByCustomXml)}"`), "start" === e.edge && (void 0 !== e.name && r.push(`w:name="${oo(e.name)}"`), void 0 !== e.author && r.push(`w:author="${oo(e.author)}"`), void 0 !== e.date && Number.isFinite(e.date) && r.push(`w:date="${new Date(e.date).toISOString()}"`), void 0 !== e.columnFirst && r.push(`w:colFirst="${Math.trunc(e.columnFirst)}"`), void 0 !== e.columnLast && r.push(`w:colLast="${Math.trunc(e.columnLast)}"`)), `<w:${t} ${r.join(" ")}/>`;
		}(e.revisionRangeMarker);
		if (e.__isFootnoteRefMarker) return Vi("footnote");
		if (e.__isEndnoteRefMarker) return Vi("endnote");
		const i = ma(e);
		if (i) return i;
		const a = function(e, t, r) {
			const n = oe(e.styles, t, r), o = {
				styleId: e.styles?.styleId,
				bold: n.bold,
				italic: n.italic,
				underline: n.underline,
				underlineStyle: n.underlineStyle,
				underlineColor: n.underlineColor,
				strike: n.strike,
				doubleStrike: n.doubleStrike,
				superscript: n.superscript,
				subscript: n.subscript,
				smallCaps: n.smallCaps,
				allCaps: n.allCaps,
				hidden: n.hidden,
				noProof: n.noProof,
				webHidden: n.webHidden,
				specVanish: n.specVanish,
				rtl: n.rtl,
				complexScript: n.complexScript,
				snapToGrid: n.snapToGrid,
				fitText: n.fitText,
				emphasisMark: n.emphasisMark,
				textBorder: n.textBorder,
				outline: n.outline,
				shadow: n.shadow,
				emboss: n.emboss,
				imprint: n.imprint,
				textEffect: n.textEffect,
				characterScale: n.characterScale,
				characterSpacing: n.characterSpacing,
				baselineShift: n.baselineShift,
				kerningThreshold: n.kerningThreshold,
				ligatures: n.ligatures,
				numberSpacing: n.numberSpacing,
				numberForm: n.numberForm,
				stylisticSet: n.stylisticSet,
				contextualAlternates: n.contextualAlternates,
				fontFamily: n.fontFamily,
				fontSize: n.fontSize,
				color: n.color,
				textFill: n.textFill,
				textOutline: n.textOutline,
				textShadow: n.textShadow,
				glow: n.glow,
				reflection: n.reflection,
				scene3dXml: n.scene3dXml,
				props3dXml: n.props3dXml,
				highlight: n.highlight,
				shading: n.shading,
				language: n.language,
				propertyRevision: e.styles?.propertyRevision
			}, i = oe(e.styles?.styleId ? { styleId: e.styles.styleId } : void 0, t, r);
			for (const a of Object.keys(o)) ("styleId" !== a && e.styles?.styleId && "character" === r?.[e.styles.styleId]?.type && void 0 === e.styles[a] && o[a] === i[a] || !1 === o[a] && !1 !== e.styles?.[a] && !0 !== i[a]) && delete o[a];
			return e.styles?.link && (o.link = e.styles.link), o;
		}(e, r, n), s = () => Oi(a), l = () => `<w:r>${s()}${Bi(e.text)}</w:r>`;
		return ga(e, z(e, {
			footnoteReference: (e) => function(e, t, r) {
				const n = B(e);
				return Xi("footnote", n ? {
					noteId: n.footnoteId,
					customMark: n.customMark
				} : void 0, t, r);
			}(e, a, t) ?? l(),
			endnoteReference: (e) => function(e, t, r) {
				const n = U(e);
				return Xi("endnote", n ? {
					noteId: n.endnoteId,
					customMark: n.customMark
				} : void 0, t, r);
			}(e, a, t) ?? l(),
			fieldChar: (e) => function(e, t) {
				const r = (e.fieldLock ? " w:fldLock=\"true\"" : "") + (e.dirty ? " w:dirty=\"true\"" : "");
				return `<w:r>${t}<w:fldChar w:fldCharType="${e.kind}"${r}/></w:r>`;
			}(e.fieldChar, s()),
			fieldInstruction: (e) => {
				return t = e.fieldInstruction, `<w:r>${s()}<w:instrText xml:space="preserve">${oo(t)}</w:instrText></w:r>`;
				var t;
			},
			field: (e) => function(e, t, r = "1") {
				let n;
				if ("DATE" === e.type) n = ` DATE \\@ "${e.dateFormat ?? "M/d/yyyy"}" `;
				else if ("REF" === e.type || "PAGEREF" === e.type) n = ` ${e.type} ${e.bookmark ?? ""} \\h `;
				else {
					const t = "PAGE" === e.type ? " PAGE " : " NUMPAGES ", r = function(e) {
						if (e && "decimal" !== e) return e;
					}(e.format);
					n = r ? ` ${t.trim()} \\* ${r} ` : t;
				}
				return `<w:fldSimple w:instr="${oo(n)}"><w:r>${t}<w:t xml:space="preserve">${oo(r)}</w:t></w:r></w:fldSimple>`;
			}(e.field, s(), "DATE" === e.field.type || "REF" === e.field.type ? e.text : void 0),
			textBox: (e) => Wi(e, e.textBox, t, n, s(), o),
			image: (e) => {
				const r = t.imageMap.get(e.id);
				if (r) {
					const n = qi(e.id, r, t, s());
					if (null !== n) return n;
				}
				return l();
			},
			sym: (e) => `<w:r>${s()}<w:sym w:font="${oo(e.sym.font)}" w:char="${e.sym.char}"/></w:r>`,
			math: (e) => function(e) {
				const t = `<m:oMath>${Yi(e.children)}</m:oMath>`;
				return e.display ? `<m:oMathPara>${t}</m:oMathPara>` : t;
			}(e.math),
			text: () => l()
		}));
	}
	function ba(e, t, r, n, o) {
		let i = wa(e, t, r, n, o);
		if (e.revisionRangeMarker) return i;
		"delete" === e.revision?.type && (i = vi(i));
		const a = e.styles?.link, s = a ? function(e, t, r) {
			if (t.startsWith("#")) return `<w:hyperlink w:anchor="${oo(t.slice(1))}">${e}</w:hyperlink>`;
			const n = r.hyperlinkMap.get(t);
			return n ? `<w:hyperlink r:id="${n}">${e}</w:hyperlink>` : e;
		}(i, a, t) : i;
		return e.revision ? function(e, t) {
			const r = xi(t), n = function(e) {
				return "from" === e.move ? "moveFrom" : "to" === e.move ? "moveTo" : "delete" === e.type ? "del" : "ins";
			}(t);
			return `<w:${n} ${r}>${e}</w:${n}>`;
		}(s, e.revision) : s;
	}
	function va(e, t) {
		let r = "", n = 0;
		for (; n < e.length;) {
			const o = e[n], i = o.sdtWrappers?.[0];
			if (!i) {
				r += t(o), n += 1;
				continue;
			}
			const a = [];
			let s = n;
			for (; s < e.length && e[s].sdtWrappers?.[0]?.groupId === i.groupId;) {
				const t = e[s], r = t.sdtWrappers.slice(1);
				a.push({
					...t,
					sdtWrappers: r.length > 0 ? r : void 0
				}), s += 1;
			}
			const l = va(a, t);
			r += `<w:sdt>${Lo(i.sdtPr)}${i.sdtEndPrXml ?? ""}<w:sdtContent>${l}</w:sdtContent></w:sdt>`, n = s;
		}
		return r;
	}
	const ya = /* @__PURE__ */ new Set([
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
	function xa(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Ea(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Sa(e) {
		return e.localName ?? e.tagName;
	}
	function Na(e) {
		return `${e.namespaceURI ?? ""}\0${Sa(e)}`;
	}
	function ka(e, t) {
		if (!e || xa(e)) return t;
		const r = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "pPr" === Sa(t) ? t : void 0;
		}(e), n = function(e) {
			if (e) {
				const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}">${e}</oasis:root>`, "application/xml").documentElement, r = t ? Ea(t) : [];
				if (1 === r.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r[0].namespaceURI && "pPr" === Sa(r[0])) return r[0];
			}
			return new b.DOMParser().parseFromString(`<w:pPr xmlns:w="${eo}"/>`, "application/xml").documentElement;
		}(t);
		if (!r || !n) return t;
		(function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		})(r, n);
		const o = Ea(r), i = Ea(n), a = /* @__PURE__ */ new Map();
		for (const u of i) {
			const e = Na(u), t = a.get(e) ?? [];
			t.push(u), a.set(e, t);
		}
		const s = /* @__PURE__ */ new Map();
		for (const u of o) {
			const e = Na(u), t = s.get(e) ?? 0;
			s.set(e, t + 1);
			const r = a.get(e)?.[t];
			r && Vo(u, r);
		}
		const l = new Set(i.map(Na)), c = o.filter((e) => {
			return !(t = e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && ya.has(Sa(t)) || l.has(Na(e)));
			var t;
		});
		for (const u of c) {
			const e = o.indexOf(u), t = o.slice(e + 1).find((e) => l.has(Na(e))), r = t ? Ea(n).find((e) => Na(e) === Na(t)) ?? null : null;
			n.insertBefore(u.cloneNode(!0), r);
		}
		return t || 1 !== n.attributes.length || 0 !== Ea(n).length ? new b.XMLSerializer().serializeToString(n) : "";
	}
	const _a = /* @__PURE__ */ new Set([
		"pPr",
		"r",
		"hyperlink",
		"fldSimple",
		"bookmarkStart",
		"bookmarkEnd",
		"commentRangeStart",
		"commentRangeEnd"
	]);
	function Ta(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Ia(e) {
		return e.localName ?? e.tagName;
	}
	function Aa(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${eo}" xmlns:w14="${no}" xmlns:r="${ro}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!r) return;
		const n = Ta(r);
		return 1 === n.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n[0].namespaceURI && Ia(n[0]) === t ? n[0] : void 0;
	}
	function Ca(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function Ra(e, t) {
		const r = (n = "pPr", Ta(e).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && Ia(e) === n));
		var n;
		if (!t) return r && e.removeChild(r), !0;
		const o = Aa(t, "pPr");
		if (!o) return !1;
		const i = o.cloneNode(!0);
		return r ? e.replaceChild(i, r) : e.insertBefore(i, e.firstChild), !0;
	}
	function $a(e, t, r, n) {
		const o = Jr(e)?.xml;
		if (!o || n.hasOverrides || n.hasBoundaryTokens || e.dropCap || /\br:(?:id|embed|link)\s*=/.test(o)) return;
		const i = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "p" === Ia(t) ? t : void 0;
		}(o);
		if (!i || !function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const r = e.attributes[t];
				if (r && !Ca(r) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== r.namespaceURI) return !0;
			}
			return Ta(e).some((e) => {
				const t = Ia(e);
				return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !_a.has(t);
			});
		}(i)) return;
		const a = function(e) {
			const t = [], r = (e) => {
				for (const n of Ta(e)) {
					const e = Ia(n);
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== n.namespaceURI || "r" !== e ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== n.namespaceURI || "pPr" !== e && "p" !== e && "tbl" !== e && "txbxContent" !== e) && r(n) : t.push(n);
				}
			};
			return r(e), t;
		}(i);
		if (a.length !== r.length) return;
		const s = r.map((e) => Aa(e, "r"));
		if (!s.some((e) => !e) && Ra(i, t)) {
			for (let e = 0; e < a.length; e += 1) a[e].parentNode?.replaceChild(s[e].cloneNode(!0), a[e]);
			return new b.XMLSerializer().serializeToString(i);
		}
	}
	function Da(e, t) {
		return e.rows.some((e) => e.cells.some((e) => e.blocks.some((e) => function(e, t) {
			switch (e.type) {
				case "paragraph": return Boolean(t.bookmarkEventsByParagraph?.has(e.id) || t.commentEventsByParagraph?.has(e.id));
				case "table": return Da(e, t);
				default: return L(e, "block");
			}
		}(e, t))));
	}
	function Pa(e, t, r) {
		switch (e.type) {
			case "paragraph": return Ma(e, t, r);
			case "table": return (e.style?.pageBreakBefore ? "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>" : "") + ((function(e) {
				const t = cn(e)?.xml;
				return Boolean(t && /<w:trPr(?:\s|>)[\s\S]*?<w:jc\b[^>]*\bw:val="(?:start|end)"/.test(t));
			}(e) ? void 0 : function(e, t) {
				const r = cn(e);
				if (r && !t.hasBoundaryTokens && !jr(r.xml)) return r.semanticSignature === en(e) ? r.xml : void 0;
			}(e, { hasBoundaryTokens: Da(e, t) })) ?? mi(e, (e, n) => function(e, t, r, n) {
				return "paragraph" === e.type ? Ma(e, r, n, { align: t.style?.horizontalAlign }) : Pa(e, r, n);
			}(e, n, t, r)));
			default: return L(e, "block");
		}
	}
	function Fa(e, t, r) {
		let n = "", o = 0;
		for (; o < e.length;) {
			const i = e[o], a = i.sdtWrappers?.[0];
			if (!a) {
				n += Pa(i, t, r), o += 1;
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
			const c = Fa(s, t, r);
			n += `<w:sdt>${Lo(a.sdtPr)}${a.sdtEndPrXml ?? ""}<w:sdtContent>${c}</w:sdtContent></w:sdt>`, o = l;
		}
		return n;
	}
	function Ma(e, t, r, n) {
		const o = e.runs.length > 0 ? e.runs : [{
			id: "",
			text: "",
			kind: "text"
		}], i = e.dropCap ? function(e) {
			const t = Oi(e.style);
			return `<w:p><w:pPr><w:keepNext/><w:framePr w:dropCap="${e.type}" w:lines="${e.lines}" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/><w:spacing w:after="0"/>${t ? `<w:rPr>${r = t, r.replace(/^<w:rPr>/, "").replace(/<\/w:rPr>$/, "")}</w:rPr>` : ""}</w:pPr><w:r>${t}${Bi(e.text)}</w:r></w:p>`;
			var r;
		}(e.dropCap) : "", a = t.bookmarkEventsByParagraph?.get(e.id), s = t.commentEventsByParagraph?.get(e.id), l = [...(a ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: uo(e)
		})), ...(s ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: po(e)
		}))], c = function(e, t) {
			const r = Jr(e);
			if (!(!r?.xml || !r.semanticSignature || t.hasOverrides || t.hasBoundaryTokens || jr(r.xml) || Br.test(r.xml) || Ur.test(r.xml))) return r.semanticSignature === Qr(e) ? r.xml : void 0;
		}(e, {
			hasOverrides: Boolean(n),
			hasBoundaryTokens: l.length > 0
		});
		if (c) return c;
		const u = (n) => ba(n, t, e.style?.styleId, r, Fa), d = 0 === l.length ? o.map(u) : void 0, p = 0 === l.length ? va(o, u) : function(e, t, r, n, o) {
			const i = [...t].sort((e, t) => e.offset - t.offset || e.seq - t.seq);
			let a = 0, s = 0, l = va(e, (e) => {
				let t = "";
				const l = s, c = l + e.text.length;
				for (; a < i.length && i[a].offset <= l;) t += i[a].xml, a += 1;
				if (function(e) {
					return "text" === e.kind || "sym" === e.kind;
				}(e) && e.text.length > 0) {
					let s = l;
					for (; a < i.length && i[a].offset < c;) {
						const c = i[a];
						c.offset > s && (t += ba({
							...e,
							text: e.text.slice(s - l, c.offset - l)
						}, r, n, o, Fa)), t += c.xml, a += 1, s = c.offset;
					}
					s < c && (t += ba({
						...e,
						text: e.text.slice(s - l)
					}, r, n, o, Fa));
				} else t += ba(e, r, n, o, Fa);
				return s = c, t;
			});
			for (; a < i.length;) l += i[a].xml, a += 1;
			return l;
		}(o, l, t, e.style?.styleId, r), f = function(e) {
			return Jr(e)?.attributes;
		}(e), h = f ? ` ${f}` : "", g = function(e, t, r) {
			const n = Jr(e)?.paragraphProperties;
			return !n || xa(n.xml) ? t : r || e.list || n.semanticSignature !== Kr(e) ? ka(n.xml, t) : n.xml;
		}(e, Ti(e, t.numberingInfo, r, n), Boolean(n));
		if (d) {
			const t = $a(e, g, d, {
				hasOverrides: Boolean(n),
				hasBoundaryTokens: !1
			});
			if (t) return t;
		}
		return `${i}<w:p${h}>${g}${p}</w:p>`;
	}
	function Oa(e) {
		const t = e.footnotes?.items;
		if (!t) return [];
		const r = /* @__PURE__ */ new Map(), n = go(t);
		for (const { run: o } of function(e) {
			return Tn(e, "footnoteReference");
		}(e)) {
			const e = B(o);
			if (!e || r.has(e.footnoteId)) continue;
			const i = t[e.footnoteId];
			i && r.set(e.footnoteId, {
				footnoteId: e.footnoteId,
				docxId: n(i),
				footnote: i
			});
		}
		return Array.from(r.values());
	}
	function La(e) {
		if (0 === e.length) return [Ba()];
		const [t, ...r] = e;
		return "paragraph" !== t.type ? [
			Ba(!0),
			t,
			...r
		] : [(n = t, {
			...n,
			runs: [{
				id: "synthetic:footnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "FootnoteReference",
					superscript: !0
				},
				__isFootnoteRefMarker: !0
			}, ...n.runs],
			style: n.style?.styleId ? n.style : {
				...n.style ?? {},
				styleId: "FootnoteText"
			}
		}), ...r];
		var n;
	}
	function Ba(e = !0) {
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
	function Ua(e) {
		const t = e.endnotes?.items;
		if (!t) return [];
		const r = /* @__PURE__ */ new Map(), n = go(t);
		for (const { run: o } of function(e) {
			return Tn(e, "endnoteReference");
		}(e)) {
			const e = U(o);
			if (!e || r.has(e.endnoteId)) continue;
			const i = t[e.endnoteId];
			i && r.set(e.endnoteId, {
				endnoteId: e.endnoteId,
				docxId: n(i),
				endnote: i
			});
		}
		return Array.from(r.values());
	}
	function za(e) {
		if (0 === e.length) return [Ha()];
		const [t, ...r] = e;
		return "paragraph" !== t.type ? [
			Ha(!0),
			t,
			...r
		] : [(n = t, {
			...n,
			runs: [{
				id: "synthetic:endnoteRef",
				text: "",
				kind: "text",
				styles: {
					styleId: "EndnoteReference",
					superscript: !0
				},
				__isEndnoteRefMarker: !0
			}, ...n.runs],
			style: n.style?.styleId ? n.style : {
				...n.style ?? {},
				styleId: "EndnoteText"
			}
		}), ...r];
		var n;
	}
	function Ha(e = !0) {
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
	const ja = [
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
	function qa(e) {
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
		return Object.keys(t).length > 0 ? Io({
			id: "table-style-cell",
			blocks: [],
			style: t
		}) : "";
	}
	function Wa(e, t) {
		if ("number" == typeof t) return `<w:${e} w:w="${so(t) ?? 0}" w:type="dxa"/>`;
		if ("string" == typeof t && t.endsWith("%")) {
			const r = Number.parseFloat(t);
			return Number.isFinite(r) ? `<w:${e} w:w="${Math.round(50 * r)}" w:type="pct"/>` : "";
		}
		return "auto" === t ? `<w:${e} w:w="0" w:type="auto"/>` : "";
	}
	function Ga(e) {
		if (!e) return "";
		const t = [];
		void 0 !== e.rowBandSize && t.push(`<w:tblStyleRowBandSize w:val="${e.rowBandSize}"/>`), void 0 !== e.colBandSize && t.push(`<w:tblStyleColBandSize w:val="${e.colBandSize}"/>`);
		const r = Wa("tblW", e.width);
		r && t.push(r);
		const n = Wa("tblInd", e.indentLeft);
		n && t.push(n);
		const o = Wa("tblCellSpacing", e.cellSpacing);
		if (o && t.push(o), e.align && t.push(`<w:jc w:val="${e.align}"/>`), e.layout && t.push(`<w:tblLayout w:type="${e.layout}"/>`), void 0 !== e.bidiVisual && t.push(`<w:bidiVisual w:val="${e.bidiVisual ? "1" : "0"}"/>`), e.defaultCellMargins) {
			const r = Object.entries(e.defaultCellMargins).map(([e, t]) => `<w:${e} w:w="${so(t) ?? 0}" w:type="dxa"/>`).join("");
			r && t.push(`<w:tblCellMar>${r}</w:tblCellMar>`);
		}
		if (e.borders) {
			const { borders: r } = e, n = It.filter(([, e]) => !!r[e]).map(([e, t]) => `<w:${e} ${wo(r[t])}`).join("");
			n && t.push(`<w:tblBorders>${n}</w:tblBorders>`);
		}
		return t.length > 0 ? `<w:tblPr>${t.join("")}</w:tblPr>` : "";
	}
	function Va(e, t) {
		const r = [], n = t.paragraphStyle ? _i(t.paragraphStyle) : "";
		n && r.push(n);
		const o = t.textStyle ? Oi(t.textStyle) : "";
		o && r.push(o);
		const i = Ga(t.tableStyle);
		i && r.push(i);
		const a = t.rowStyle ? Ro(t.rowStyle) : "";
		a && r.push(a);
		const s = qa(t);
		return s && r.push(s), 0 === r.length ? "" : `<w:tblStylePr w:type="${oo(e)}">${r.join("")}</w:tblStylePr>`;
	}
	function Xa(e) {
		const t = [];
		if (t.push(`<w:name w:val="${oo(e.name)}"/>`), e.basedOn && t.push(`<w:basedOn w:val="${oo(e.basedOn)}"/>`), e.nextStyle && t.push(`<w:next w:val="${oo(e.nextStyle)}"/>`), void 0 !== e.uiPriority && t.push(`<w:uiPriority w:val="${Math.max(0, Math.floor(e.uiPriority))}"/>`), void 0 !== e.qFormat && t.push(`<w:qFormat w:val="${e.qFormat ? "1" : "0"}"/>`), void 0 !== e.semiHidden && t.push(`<w:semiHidden w:val="${e.semiHidden ? "1" : "0"}"/>`), void 0 !== e.unhideWhenUsed && t.push(`<w:unhideWhenUsed w:val="${e.unhideWhenUsed ? "1" : "0"}"/>`), ("paragraph" === e.type || "table" === e.type) && e.paragraphStyle) {
			const r = _i(e.paragraphStyle);
			r && t.push(r);
		}
		if (e.textStyle) {
			const r = Oi(e.textStyle);
			r && t.push(r);
		}
		if ("table" === e.type && e.tableStyle) {
			const r = e.tableStyle, n = Ga(r);
			if (n && t.push(n), r.conditionalFormats) {
				const e = [...ja.filter((e) => e in r.conditionalFormats), ...Object.keys(r.conditionalFormats).filter((e) => !ja.includes(e))];
				for (const n of e) {
					const e = r.conditionalFormats[n];
					if (e) {
						const r = Va(n, e);
						r && t.push(r);
					}
				}
			}
		}
		return `<w:style w:type="${"character" === e.type ? "character" : "table" === e.type ? "table" : "paragraph"}" w:styleId="${oo(e.id)}"${e.isDefault ? " w:default=\"1\"" : ""}>${t.join("")}</w:style>`;
	}
	function Za(e, t, r, n, o, i, a, s, l, c = !1) {
		const u = n.map((e) => {
			const t = "header" === e.kind ? "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml" : "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";
			return `<Override PartName="/word/${e.path}" ContentType="${t}"/>`;
		}).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${function(e) {
			const t = /* @__PURE__ */ new Set();
			let r = "";
			for (const n of e) {
				const e = n.toLowerCase();
				if (t.has(e)) continue;
				const o = ze[e];
				o && (t.add(e), r += `<Default Extension="${e}" ContentType="${o}"/>`);
			}
			return r;
		}(t)}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${a ? "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" : ""}${e ? "<Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/>" : ""}${r ? "<Override PartName=\"/word/settings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml\"/>" : ""}${o ? "<Override PartName=\"/word/footnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml\"/>" : ""}${i ? "<Override PartName=\"/word/endnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml\"/>" : ""}${s ? "<Override PartName=\"/word/comments.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml\"/><Override PartName=\"/word/commentsExtended.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml\"/>" : ""}${l ? "<Override PartName=\"/word/fontTable.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml\"/>" : ""}${c ? "<Override PartName=\"/word/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>" : ""}${u}</Types>`;
	}
	const Ya = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, Qa = {
		continuous: "continuous",
		eachSection: "eachSect"
	};
	function Ka(e, t) {
		if (!t) return null;
		const r = [];
		return t.numberFormat && r.push(`<w:numFmt w:val="${Ya[t.numberFormat]}"/>`), void 0 !== t.startAt && r.push(`<w:numStart w:val="${Math.max(1, t.startAt)}"/>`), t.restart && r.push(`<w:numRestart w:val="${Qa[t.restart]}"/>`), r.length > 0 ? `<w:${e}>${r.join("")}</w:${e}>` : null;
	}
	function Ja(e, t) {
		let r = "";
		for (const n of t) r += `<Relationship Id="${n.rId}" Type="${ro}/hyperlink" Target="${oo(n.href)}" TargetMode="External"/>`;
		for (const n of e) {
			const e = "linked" === n.kind ? " TargetMode=\"External\"" : "";
			r += `<Relationship Id="${n.rId}" Type="${ro}/image" Target="${oo(n.target)}"${e}/>`;
		}
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${to}">${r}</Relationships>`;
	}
	function es(e, t) {
		t(e);
		for (const r of e.runs) "textBox" === r.kind && ts(r.textBox.blocks, t);
	}
	function ts(e, t) {
		for (const r of e) switch (r.type) {
			case "paragraph":
				es(r, t);
				break;
			case "table":
				for (const e of r.rows) for (const r of e.cells) ts(r.blocks, t);
				break;
			default: L(r, "block");
		}
	}
	function rs(e, t) {
		for (let r = 0; r < e.attributes.length; r += 1) {
			const n = e.attributes.item(r);
			if (n?.localName === t) return n.value;
		}
	}
	function ns(e, t, r) {
		if (!e) return 0;
		const n = new b.DOMParser().parseFromString(e, "application/xml");
		let o = 0;
		for (const i of Array.from(n.getElementsByTagNameNS(eo, t))) {
			const e = rs(i, r);
			if (!e || !/^\d+$/.test(e)) continue;
			const t = Number.parseInt(e, 10);
			Number.isSafeInteger(t) && (o = Math.max(o, t));
		}
		return o;
	}
	function os(e, t) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= t;
	}
	function is(e) {
		const t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), n = [], o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = function(e) {
			const t = e.sourcePackage;
			if (!t) return;
			const r = t.parts[t.mainDocumentPart]?.relationships?.find((e) => "External" !== e.targetMode && e.type.endsWith("/numbering") && Boolean(e.resolvedTarget)), n = r?.resolvedTarget ? t.parts[r.resolvedTarget] : void 0;
			return "xml" === n?.kind ? n.data : void 0;
		}(e);
		let s = Math.max(1, ns(a, "abstractNum", "abstractNumId") + 1), l = Math.max(1, ns(a, "num", "numId") + 1);
		const c = (e) => {
			if (os(e, 0) && !o.has(e)) return o.add(e), e;
			for (; o.has(s);) s += 1;
			const t = s;
			return s += 1, o.add(t), t;
		}, u = (e) => {
			if (os(e, 1) && !i.has(e)) return i.add(e), e;
			for (; i.has(l);) l += 1;
			const t = l;
			return l += 1, i.add(t), t;
		}, d = [], p = (e) => {
			e.list && d.push(e);
		};
		for (const f of le(e)) ts(f.blocks, p), f.header && ts(f.header, p), f.firstPageHeader && ts(f.firstPageHeader, p), f.evenPageHeader && ts(f.evenPageHeader, p), f.footer && ts(f.footer, p), f.firstPageFooter && ts(f.firstPageFooter, p), f.evenPageFooter && ts(f.evenPageFooter, p);
		for (const f of d) {
			const e = f.list, o = Math.max(0, e.level ?? 0), i = e.bulletGlyph ?? "", a = e.instanceId ? `instance:${e.instanceId}` : `legacy:${e.kind}:${o}:${i}`;
			let s = r.get(a);
			if (!s) {
				const t = ct(e), o = void 0 !== t?.sourceNumId && e.instanceId === String(t.sourceNumId);
				s = {
					abstractNumId: c(o ? t.sourceAbstractNumId : void 0),
					numId: u(o ? t.sourceNumId : void 0),
					levels: []
				}, r.set(a, s), n.push(s);
			}
			if (!s.levels.some((e) => e.level === o)) {
				const t = ct(e), r = ut(e);
				s.levels.push({
					kind: e.kind,
					level: o,
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
			t.set(f.id, {
				numId: s.numId,
				level: o
			});
		}
		return {
			numberingInfo: t,
			definitions: n
		};
	}
	const as = `xmlns:w="${eo}" xmlns:w14="${no}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:r="${ro}"`;
	function ss(e, t, r, n) {
		const o = io(e.width, 12240), i = io(e.height, 15840), a = e.margins, s = "landscape" === e.orientation ? " w:orient=\"landscape\"" : "", l = [
			t?.header?.first ? `<w:headerReference w:type="first" r:id="${t.header.first.relId}"/>` : "",
			t?.header?.even ? `<w:headerReference w:type="even" r:id="${t.header.even.relId}"/>` : "",
			t?.header?.default ? `<w:headerReference w:type="default" r:id="${t.header.default.relId}"/>` : "",
			t?.footer?.first ? `<w:footerReference w:type="first" r:id="${t.footer.first.relId}"/>` : "",
			t?.footer?.even ? `<w:footerReference w:type="even" r:id="${t.footer.even.relId}"/>` : "",
			t?.footer?.default ? `<w:footerReference w:type="default" r:id="${t.footer.default.relId}"/>` : ""
		].join(""), c = t?.header?.first || t?.footer?.first ? "<w:titlePg/>" : "", u = n && "nextPage" !== n ? `<w:type w:val="${n}"/>` : "", d = e.columns;
		let p = "";
		if (d && d.count > 1) {
			const e = io(d.space, 0), t = d.separator ? " w:sep=\"1\"" : "";
			if (!1 === d.equalWidth && d.columns?.length) {
				const r = d.columns.map((e) => `<w:col w:w="${io(e.width, 0)}" w:space="${io(e.space, 0)}"/>`).join("");
				p = `<w:cols w:num="${d.count}" w:space="${e}" w:equalWidth="0"${t}>${r}</w:cols>`;
			} else p = `<w:cols w:num="${d.count}" w:space="${e}"${t}/>`;
		}
		const f = r.pageNumbering;
		let h = "";
		if (f) {
			const e = [];
			void 0 !== f.start && e.push(`w:start="${f.start}"`), f.format && e.push(`w:fmt="${oo(f.format)}"`), f.chapterStyle && e.push(`w:chapStyle="${oo(f.chapterStyle)}"`), f.chapterSeparator && e.push(`w:chapSep="${oo(f.chapterSeparator)}"`), e.length > 0 && (h = `<w:pgNumType ${e.join(" ")}/>`);
		}
		const m = r.verticalAlignment && "top" !== r.verticalAlignment ? `<w:vAlign w:val="${r.verticalAlignment}"/>` : "", g = r.bidi ? "<w:bidi/>" : "", w = r.pageBorder, b = w?.color.replace("#", "").toUpperCase(), v = w ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:left w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:bottom w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:right w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/></w:pgBorders>` : "", y = r.propertyRevision ? `<w:sectPrChange ${xi(r.propertyRevision)}>${ss(r.propertyRevision.previous.pageSettings, void 0, (x = r.propertyRevision.previous, {
			id: "section:revision",
			blocks: [],
			pageSettings: x.pageSettings,
			...void 0 !== x.pageBorder ? { pageBorder: x.pageBorder } : {},
			...x.pageNumbering ? { pageNumbering: x.pageNumbering } : {},
			...x.verticalAlignment ? { verticalAlignment: x.verticalAlignment } : {},
			...void 0 !== x.bidi ? { bidi: x.bidi } : {}
		}), r.propertyRevision.previous.nextBreakType)}</w:sectPrChange>` : "";
		var x;
		return `<w:sectPr>${l}${c}${u}<w:pgSz w:w="${o}" w:h="${i}"${s}/><w:pgMar w:top="${io(a.top, 1440)}" w:right="${io(a.right, 1440)}" w:bottom="${io(a.bottom, 1440)}" w:left="${io(a.left, 1440)}" w:header="${io(a.header, 720)}" w:footer="${io(a.footer, 720)}" w:gutter="${io(a.gutter, 0)}"/>${h}${p}${m}${g}${v}${y}</w:sectPr>`;
	}
	function ls(e, t, r) {
		const n = le(e), o = n.map((o, i) => Fa(o.blocks, t, e.styles) + ss(o.pageSettings, r[i], o, n[i + 1]?.breakType)).join(""), i = e.design?.pageColor?.replace("#", "").toUpperCase();
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${as}>${i ? `<w:background w:color="${i}"/>` : ""}<w:body>${o}</w:body></w:document>`;
	}
	function cs(e, t, r, n, o) {
		const i = "header" === e ? "hdr" : "ftr", a = "header" === e && "text" === o?.kind && o.text ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml"><v:shape type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#94a3b8"}" fillopacity="${o.opacity ?? .25}"><v:textpath on="true" string="${oo(o.text)}" style="font-family:${oo(o.fontFamily ?? "Arial")};font-size:${o.fontSize ?? 48}pt"/></v:shape></w:pict>` : "header" === e && "image" === o?.kind && r.images.some((e) => "__watermark" === e.runId) ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shape type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#ffffff"}" fillopacity="${o.opacity ?? .25}" stroked="f"><v:imagedata r:id="rIdWatermark" o:title="Watermark"/></v:shape></w:pict>` : "";
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${i} ${as}>${a}${Fa(t, r, n)}</w:${i}>`;
	}
	function us(e) {
		if (e) return {
			...e,
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: us(e.propertyRevision.previous) ?? {}
			} : void 0
		};
	}
	function ds(e) {
		if (e) return {
			...e,
			tabs: e.tabs ? e.tabs.map((e) => ({ ...e })) : e.tabs,
			propertyRevision: e.propertyRevision ? {
				...e.propertyRevision,
				previous: ds(e.propertyRevision.previous) ?? {}
			} : void 0
		};
	}
	function ps(e) {
		return Array.isArray(e) ? e.map(ps) : e && "object" == typeof e ? Object.fromEntries(Object.entries(e).map(([e, t]) => [e, ps(t)])) : e;
	}
	function fs(e) {
		const t = {
			id: e.id,
			text: e.text,
			styles: us(e.styles),
			revision: e.revision ? { ...e.revision } : void 0,
			revisionRangeMarker: e.revisionRangeMarker ? { ...e.revisionRangeMarker } : void 0,
			sdtWrappers: e.sdtWrappers ? [...e.sdtWrappers] : void 0
		};
		return function(e, t) {
			const r = Yr(e);
			return r && (t.ooxmlSource = { ...r }), t;
		}(e, z(e, {
			text: () => ({
				...t,
				kind: "text"
			}),
			image: (e) => ({
				...t,
				kind: "image",
				image: { ...e.image }
			}),
			textBox: (e) => {
				return {
					...t,
					kind: "textBox",
					textBox: (r = e.textBox, {
						...r,
						floating: r.floating ? {
							...r.floating,
							positionH: r.floating.positionH ? { ...r.floating.positionH } : void 0,
							positionV: r.floating.positionV ? { ...r.floating.positionV } : void 0
						} : void 0,
						shape: r.shape ? { ...r.shape } : void 0,
						body: r.body ? { ...r.body } : void 0,
						blocks: ms(r.blocks)
					})
				};
				var r;
			},
			field: (e) => ({
				...t,
				kind: "field",
				field: { ...e.field }
			}),
			fieldChar: (e) => ({
				...t,
				kind: "fieldChar",
				fieldChar: { ...e.fieldChar }
			}),
			fieldInstruction: (e) => ({
				...t,
				kind: "fieldInstruction",
				fieldInstruction: e.fieldInstruction
			}),
			footnoteReference: (e) => ({
				...t,
				kind: "footnoteReference",
				footnoteReference: { ...e.footnoteReference }
			}),
			endnoteReference: (e) => ({
				...t,
				kind: "endnoteReference",
				endnoteReference: { ...e.endnoteReference }
			}),
			sym: (e) => ({
				...t,
				kind: "sym",
				sym: { ...e.sym }
			}),
			math: (e) => {
				return {
					...t,
					kind: "math",
					math: (r = e.math, ps(r))
				};
				var r;
			}
		}));
	}
	function hs(e) {
		return {
			...e,
			runs: e.runs.map(fs),
			style: ds(e.style),
			list: e.list ? { ...e.list } : void 0,
			numberingRevision: e.numberingRevision ? { ...e.numberingRevision } : void 0
		};
	}
	function ms(e) {
		return e.map((e) => {
			switch (e.type) {
				case "paragraph": return hs(e);
				case "table": return {
					...e,
					style: e.style ? {
						...e.style,
						defaultCellMargins: e.style.defaultCellMargins ? { ...e.style.defaultCellMargins } : void 0,
						floating: e.style.floating ? { ...e.style.floating } : void 0,
						revision: e.style.revision ? {
							...e.style.revision,
							previous: { ...e.style.revision.previous }
						} : void 0
					} : void 0,
					gridRevision: e.gridRevision ? {
						...e.gridRevision,
						previous: [...e.gridRevision.previous]
					} : void 0,
					rows: e.rows.map((e) => ({
						...e,
						conditionalStyle: e.conditionalStyle ? { ...e.conditionalStyle } : void 0,
						style: e.style ? {
							...e.style,
							revision: e.style.revision ? { ...e.style.revision } : void 0,
							propertyRevision: e.style.propertyRevision ? {
								...e.style.propertyRevision,
								previous: { ...e.style.propertyRevision.previous }
							} : void 0
						} : void 0,
						cells: e.cells.map((e) => ({
							...e,
							conditionalStyle: e.conditionalStyle ? { ...e.conditionalStyle } : void 0,
							mergeRevisionState: e.mergeRevisionState ? {
								...e.mergeRevisionState,
								previousCells: e.mergeRevisionState.previousCells.map((e) => ({
									...e,
									mergeRevisionState: void 0,
									style: e.style ? { ...e.style } : void 0,
									blocks: ms(e.blocks)
								}))
							} : void 0,
							style: e.style ? {
								...e.style,
								revision: e.style.revision ? { ...e.style.revision } : void 0,
								propertyRevision: e.style.propertyRevision ? {
									...e.style.propertyRevision,
									previous: { ...e.style.propertyRevision.previous }
								} : void 0
							} : void 0,
							blocks: ms(e.blocks)
						}))
					}))
				};
				default: return L(e, "block");
			}
		});
	}
	function gs(e) {
		return !!e && "caption" === e.style?.styleId?.toLowerCase() && e.runs.some((e) => {
			const t = function(e) {
				return "fieldInstruction" === e.kind ? e.fieldInstruction : void 0;
			}(e);
			return void 0 !== t && (/* @__PURE__ */ new RegExp("\\bSEQ\\s+Figure\\b", "i")).test(t);
		});
	}
	function ws(e, t) {
		return e.map((e) => {
			switch (e.type) {
				case "paragraph": return gs(e) ? function(e, t) {
					if (!gs(e)) return hs(e);
					let r = !1, n = !1;
					const o = e.runs.map((e) => "fieldChar" === e.kind && "separate" === e.fieldChar.kind ? (r = !0, {
						...e,
						fieldChar: { ...e.fieldChar }
					}) : "fieldChar" === e.kind && "end" === e.fieldChar.kind ? (r = !1, {
						...e,
						fieldChar: { ...e.fieldChar }
					}) : r && "" !== e.text ? e.text === String(t) ? { ...e } : (n = !0, {
						...e,
						text: String(t)
					}) : { ...e });
					return n ? {
						...hs(e),
						runs: o
					} : hs(e);
				}(e, t.next++) : hs(e);
				case "table": return {
					...e,
					rows: e.rows.map((e) => ({
						...e,
						cells: e.cells.map((e) => ({
							...e,
							blocks: ws(e.blocks, t)
						}))
					}))
				};
				default: return L(e, "block");
			}
		});
	}
	const bs = {
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
	function vs(e, t, r, n) {
		const o = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), s = [], l = /* @__PURE__ */ new Map();
		return ts(e, (e) => {
			for (const t of e.runs) {
				const e = t.styles?.link;
				if (e && !e.startsWith("#") && !l.has(e)) {
					const t = `rIdLink${s.length + 1}`;
					l.set(e, t), s.push({
						rId: t,
						href: e
					});
				}
				if ("textBox" !== t.kind || a.has(t.id) || (a.set(t.id, r.nextTextBoxDocPrId), r.nextTextBoxDocPrId += 1), "image" !== t.kind) continue;
				const c = r.nextImageId, u = `rIdImg${c}`, d = {
					rId: u,
					runId: t.id,
					cx: Math.round(t.image.width * I),
					cy: Math.round(t.image.height * I),
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
					}), i.set(t.id, u), r.nextImageId += 1;
					continue;
				}
				const p = ae(n, t.image.src).match(/^data:([^;,]+);base64,(.*)$/);
				if (!p) continue;
				const f = je(p[1]);
				if (!f) continue;
				const h = p[2], m = `media/image${c}.${f}`;
				o.push({
					...d,
					kind: "embedded",
					target: m,
					base64: h
				}), i.set(t.id, u), r.nextImageId += 1;
			}
		}), {
			numberingInfo: t.numberingInfo,
			definitions: t.definitions,
			images: o,
			imageMap: i,
			textBoxDocPrIds: a,
			hyperlinks: s,
			hyperlinkMap: l
		};
	}
	function ys(e, t, r) {
		r && (e.file(`word/${t}.xml`, r.xml), (r.partContext.images.length > 0 || r.partContext.hyperlinks.length > 0) && e.file(`word/_rels/${t}.xml.rels`, Ja(r.partContext.images, r.partContext.hyperlinks)));
	}
	async function xs(e) {
		e = function(e) {
			const t = { next: 1 }, r = le(e).map((e) => ({
				...e,
				blocks: ws(e.blocks, t),
				header: e.header ? ms(e.header) : void 0,
				footer: e.footer ? ms(e.footer) : void 0
			}));
			return {
				...e,
				sections: r
			};
		}(e);
		const t = new w.default(), r = is(e), n = {
			nextImageId: 1,
			nextTextBoxDocPrId: 1000001
		}, o = le(e), i = function(e) {
			const t = e.design?.watermark;
			if ("image" !== t?.kind || !t.src) return;
			const r = ae(e, t.src).match(/^data:([^;,]+);base64,(.*)$/);
			if (!r) return;
			const n = je(r[1]);
			return n ? {
				rId: "rIdWatermark",
				runId: "__watermark",
				kind: "embedded",
				target: `media/watermark.${n}`,
				base64: r[2],
				cx: 1,
				cy: 1
			} : void 0;
		}(e), a = Oa(e), s = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const r of e) t.set(r.footnoteId, r.docxId);
			return t;
		}(a), l = a.length > 0, c = Ua(e), u = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const r of e) t.set(r.endnoteId, r.docxId);
			return t;
		}(c), d = c.length > 0, p = function(e) {
			const t = e.bookmarks;
			if (!t || 0 === t.order.length) return;
			const r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
			for (const s of t.order) {
				const e = t.items[s];
				if (!e) continue;
				const o = e.docxIdHint;
				void 0 !== o && o >= 0 && !n.has(o) && (r.set(s, o), n.add(o));
			}
			let o = 0;
			for (const s of t.order) if (!r.has(s)) {
				for (; n.has(o);) o += 1;
				r.set(s, o), n.add(o), o += 1;
			}
			const i = /* @__PURE__ */ new Map(), a = (e, t) => {
				const r = i.get(e);
				r ? r.push(t) : i.set(e, [t]);
			};
			for (const s of t.order) {
				const e = t.items[s];
				if (!e) continue;
				const n = r.get(s);
				e.start && a(e.start.paragraphId, {
					kind: "start",
					offset: e.start.offset,
					seq: e.start.seq ?? 0,
					wId: n,
					name: e.name,
					...void 0 !== e.colFirst ? { colFirst: e.colFirst } : {},
					...void 0 !== e.colLast ? { colLast: e.colLast } : {}
				}), e.end && a(e.end.paragraphId, {
					kind: "end",
					offset: e.end.offset,
					seq: e.end.seq ?? 0,
					wId: n
				});
			}
			return i;
		}(e), f = function(e) {
			const t = e.comments;
			if (!t || 0 === t.order.length) return;
			const r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
			for (const l of t.order) {
				const e = t.items[l];
				if (!e) continue;
				const o = e.docxIdHint;
				void 0 !== o && o >= 0 && !n.has(o) && (r.set(l, o), n.add(o));
			}
			let o = 0;
			for (const l of t.order) if (!r.has(l)) {
				for (; n.has(o);) o += 1;
				r.set(l, o), n.add(o), o += 1;
			}
			const i = /* @__PURE__ */ new Map(), a = (e, t) => {
				const r = i.get(e);
				r ? r.push(t) : i.set(e, [t]);
			}, s = [];
			return t.order.forEach((e, n) => {
				const o = t.items[e];
				if (!o) return;
				const i = r.get(e), l = (1073741824 + n).toString(16).toUpperCase();
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
		}(e), h = (e) => (e.footnoteIdMap = s, e.endnoteIdMap = u, e.bookmarkEventsByParagraph = p, e.commentEventsByParagraph = f?.eventsByParagraph, e), m = h(vs(o.flatMap((e) => e.blocks), r, n, e)), g = void 0 !== f, b = [], v = o.map(() => ({}));
		let y = 1, x = 1;
		o.forEach((t, o) => {
			const a = (t, a, s) => {
				if (!(s && 0 !== s.length || "header" === t && "text" === e.design?.watermark?.kind || "header" === t && void 0 !== i)) return;
				const l = s ?? [], c = "header" === t ? y : x, u = `${t}${c}.xml`, d = `rId${"header" === t ? "Header" : "Footer"}${c}`, p = h(vs(l, r, n, e));
				"header" === t && i && p.images.push({ ...i }), b.push({
					kind: t,
					type: a,
					path: u,
					relId: d,
					blocks: l,
					context: p
				});
				const f = "header" === t ? "header" : "footer";
				(v[o][f] ??= {})[a] = { relId: d }, "header" === t ? y += 1 : x += 1;
			};
			a("header", "first", t.firstPageHeader), a("header", "even", t.evenPageHeader), a("header", "default", t.header), a("footer", "first", t.firstPageFooter), a("footer", "even", t.evenPageFooter), a("footer", "default", t.footer);
		});
		const E = r.definitions.length > 0, S = o.some((e) => (e.evenPageHeader?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0), N = S || void 0 !== e.settings?.defaultTabStop || void 0 !== e.settings?.allowSpaceOfSameStyleInTable || void 0 !== e.settings?.autoHyphenation || void 0 !== e.settings?.consecutiveHyphenLimit || void 0 !== e.settings?.hyphenationZone || void 0 !== e.settings?.doNotHyphenateCaps || void 0 !== e.footnotes?.settings || void 0 !== e.endnotes?.settings, k = [...m.images, ...b.flatMap((e) => e.context.images)], _ = l ? function(e, t, r, n, o, i, a) {
			const s = o(t.flatMap((e) => La(e.footnote.blocks)));
			s.footnoteIdMap = a;
			const l = t.map((e) => {
				const t = Fa(La(e.footnote.blocks), s, i);
				return `<w:footnote w:id="${e.docxId}">${t}</w:footnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="${eo}" xmlns:w14="${no}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${ro}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${l}</w:footnotes>`,
				partContext: s
			};
		}(0, a, 0, 0, (t) => vs(t, r, n, e), e.styles, s) : null;
		_ && k.push(..._.partContext.images);
		const T = d ? function(e, t, r, n, o, i, a) {
			const s = o(t.flatMap((e) => za(e.endnote.blocks)));
			s.endnoteIdMap = a;
			const l = t.map((e) => {
				const t = Fa(za(e.endnote.blocks), s, i);
				return `<w:endnote w:id="${e.docxId}">${t}</w:endnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:endnotes xmlns:w="${eo}" xmlns:w14="${no}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${ro}"><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote><w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>${l}</w:endnotes>`,
				partContext: s
			};
		}(0, c, 0, 0, (t) => vs(t, r, n, e), e.styles, u) : null;
		T && k.push(...T.partContext.images);
		const I = k.filter((e) => "embedded" === e.kind).map((e) => e.target.split(".").pop()?.toLowerCase()).filter((e) => Boolean(e)), A = null != e.styles && Object.keys(e.styles).length > 0, C = (e.fontTable?.length ?? 0) > 0, R = void 0 !== e.design;
		t.file("[Content_Types].xml", Za(E, I, N, b, l, d, A, g, C, R)), t.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${to}"><Relationship Id="rId1" Type="${ro}/officeDocument" Target="word/document.xml"/></Relationships>`), t.file("word/document.xml", ls(e, m, v)), A && t.file("word/styles.xml", function(e) {
			const t = Object.values(e).map(Xa).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="${no}">${t}</w:styles>`;
		}(e.styles)), E && t.file("word/numbering.xml", function(e) {
			const t = e.map(({ abstractNumId: e, levels: t }) => `<w:abstractNum w:abstractNumId="${e}">${t.sort((e, t) => e.level - t.level).map(({ kind: e, level: t, format: r, startAt: n, levelText: o, suffix: i, alignment: a, legal: s, bulletGlyph: l, bulletFont: c, ooxml: u }) => {
				const d = "bullet" === e ? "bullet" : u?.format ?? r ?? "decimal", p = o ?? ("bullet" === e ? l ?? "" : `%${t + 1}.`), f = n ?? 1, h = "bullet" === e ? c ?? "Symbol" : void 0, m = h ? `<w:rPr><w:rFonts w:ascii="${oo(h)}" w:hAnsi="${oo(h)}" w:hint="default"/></w:rPr>` : "", g = i && "tab" !== i ? `<w:suff w:val="${i}"/>` : "", w = s ? "<w:isLgl/>" : "", b = void 0 !== u?.restartAfterLevel ? `<w:lvlRestart w:val="${u.restartAfterLevel}"/>` : "", v = u?.paragraphStyleId ? `<w:pStyle w:val="${oo(u.paragraphStyleId)}"/>` : "";
				return `<w:lvl w:ilvl="${t}"><w:start w:val="${f}"/><w:numFmt w:val="${oo(d)}"/>${b}${v}<w:lvlText w:val="${oo(p)}"/><w:lvlJc w:val="${a ?? "left"}"/>${g}${w}${m}</w:lvl>`;
			}).join("")}</w:abstractNum>`).join(""), r = e.map(({ abstractNumId: e, numId: t }) => `<w:num w:numId="${t}"><w:abstractNumId w:val="${e}"/></w:num>`).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${eo}">${t}${r}</w:numbering>`;
		}(r.definitions)), (A || E || N || m.images.length > 0 || m.hyperlinks.length > 0 || b.length > 0 || l || d || g || C || R) && t.file("word/_rels/document.xml.rels", function(e, t, r, n, o, i, a, s, l, c, u = !1) {
			let d = "";
			s && (d += `<Relationship Id="rIdStyles" Type="${ro}/styles" Target="styles.xml"/>`), e && (d += `<Relationship Id="rIdNum" Type="${ro}/numbering" Target="numbering.xml"/>`), t && (d += `<Relationship Id="rIdSettings" Type="${ro}/settings" Target="settings.xml"/>`);
			for (const p of n) d += `<Relationship Id="${p.rId}" Type="${ro}/hyperlink" Target="${oo(p.href)}" TargetMode="External"/>`;
			for (const p of r) {
				const e = "linked" === p.kind ? " TargetMode=\"External\"" : "";
				d += `<Relationship Id="${p.rId}" Type="${ro}/image" Target="${oo(p.target)}"${e}/>`;
			}
			for (const p of o) {
				const e = "header" === p.kind ? "header" : "footer";
				d += `<Relationship Id="${p.relId}" Type="${ro}/${e}" Target="${p.path}"/>`;
			}
			return i && (d += `<Relationship Id="rIdFootnotes" Type="${ro}/footnotes" Target="footnotes.xml"/>`), a && (d += `<Relationship Id="rIdEndnotes" Type="${ro}/endnotes" Target="endnotes.xml"/>`), l && (d += `<Relationship Id="rIdComments" Type="${ro}/comments" Target="comments.xml"/>`, d += "<Relationship Id=\"rIdCommentsExtended\" Type=\"http://schemas.microsoft.com/office/2011/relationships/commentsExtended\" Target=\"commentsExtended.xml\"/>"), c && (d += `<Relationship Id="rIdFontTable" Type="${ro}/fontTable" Target="fontTable.xml"/>`), u && (d += `<Relationship Id="rIdTheme" Type="${ro}/theme" Target="theme/theme1.xml"/>`), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${to}">${d}</Relationships>`;
		}(E, N, m.images, m.hyperlinks, b, l, d, A, g, C, R)), C && t.file("word/fontTable.xml", function(e) {
			const t = e.map((e) => {
				const t = [];
				if (e.altName && t.push(`<w:altName w:val="${oo(e.altName)}"/>`), e.panose1 && t.push(`<w:panose1 w:val="${oo(e.panose1)}"/>`), e.charset && t.push(`<w:charset w:val="${oo(e.charset)}"/>`), e.family && t.push(`<w:family w:val="${oo(e.family)}"/>`), e.pitch && t.push(`<w:pitch w:val="${oo(e.pitch)}"/>`), e.sig) {
					const r = Object.entries(e.sig).map(([e, t]) => `w:${e}="${oo(t)}"`).join(" ");
					r && t.push(`<w:sig ${r}/>`);
				}
				return `<w:font w:name="${oo(e.name)}">${t.join("")}</w:font>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="${eo}">${t}</w:fonts>`;
		}(e.fontTable)), R && t.file("word/theme/theme1.xml", function(e) {
			const t = e?.themeData?.sourceXml;
			if (t) return t;
			const r = bs[e?.themeId ?? "oasis"] ?? bs.oasis, n = e?.themeData, o = (e, t) => (n?.colors?.[e] ?? t).replace(/^#/, "").toUpperCase(), i = {
				dk1: o("dk1", "000000"),
				lt1: o("lt1", "FFFFFF"),
				dk2: o("dk2", r.body),
				lt2: o("lt2", "FFFFFF"),
				accent1: o("accent1", r.accent),
				accent2: o("accent2", r.heading),
				accent3: o("accent3", "5B9BD5"),
				accent4: o("accent4", "70AD47"),
				accent5: o("accent5", "ED7D31"),
				accent6: o("accent6", "A5A5A5"),
				hlink: o("hlink", "0563C1"),
				folHlink: o("folHlink", "954F72")
			}, a = Object.entries(i).map(([e, t]) => `<a:${e}><a:srgbClr val="${t}"/></a:${e}>`).join(""), s = (e, t, r) => oo(n?.fonts?.[e]?.[t] ?? r), l = oo(n?.name ?? `${(e?.themeId ?? "oasis")[0].toUpperCase()}${(e?.themeId ?? "oasis").slice(1)}`), c = n?.effectsXml ?? "<a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/>";
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${l}"><a:themeElements><a:clrScheme name="${l}">${a}</a:clrScheme><a:fontScheme name="${l}"><a:majorFont><a:latin typeface="${s("major", "majorHAnsi", "Aptos Display")}"/><a:ea typeface="${s("major", "majorEastAsia", "Aptos Display")}"/><a:cs typeface="${s("major", "majorBidi", "Aptos Display")}"/></a:majorFont><a:minorFont><a:latin typeface="${s("minor", "minorHAnsi", "Aptos")}"/><a:ea typeface="${s("minor", "minorEastAsia", "Aptos")}"/><a:cs typeface="${s("minor", "minorBidi", "Aptos")}"/></a:minorFont></a:fontScheme><a:fmtScheme name="${l}">${c}</a:fmtScheme></a:themeElements></a:theme>`;
		}(e.design)), N && t.file("word/settings.xml", function(e, t, r, n, o, i) {
			const a = [], s = so(t);
			null !== s && a.push(`<w:defaultTabStop w:val="${s}"/>`), i?.autoHyphenation && a.push("<w:autoHyphenation/>"), void 0 !== i?.consecutiveHyphenLimit && i.consecutiveHyphenLimit >= 0 && a.push(`<w:consecutiveHyphenLimit w:val="${i.consecutiveHyphenLimit}"/>`);
			const l = so(i?.hyphenationZone);
			null !== l && a.push(`<w:hyphenationZone w:val="${l}"/>`), i?.doNotHyphenateCaps && a.push("<w:doNotHyphenateCaps/>");
			const c = Ka("footnotePr", r);
			c && a.push(c);
			const u = Ka("endnotePr", n);
			return u && a.push(u), e && a.push("<w:evenAndOddHeaders/>"), o && a.push("<w:compat><w:allowSpaceOfSameStyleInTable/></w:compat>"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${eo}">${a.join("")}</w:settings>`;
		}(S, e.settings?.defaultTabStop, e.footnotes?.settings, e.endnotes?.settings, e.settings?.allowSpaceOfSameStyleInTable, {
			autoHyphenation: e.settings?.autoHyphenation,
			consecutiveHyphenLimit: e.settings?.consecutiveHyphenLimit,
			hyphenationZone: e.settings?.hyphenationZone,
			doNotHyphenateCaps: e.settings?.doNotHyphenateCaps
		}));
		for (const w of b) t.file(`word/${w.path}`, cs(w.kind, w.blocks, w.context, e.styles, e.design?.watermark)), (w.context.images.length > 0 || w.context.hyperlinks.length > 0) && t.file(`word/_rels/${w.path}.rels`, Ja(w.context.images, w.context.hyperlinks));
		ys(t, "footnotes", _), ys(t, "endnotes", T), f && (t.file("word/comments.xml", ho(f)), t.file("word/commentsExtended.xml", function(e) {
			const t = new Map(e.comments.map(({ comment: e, paraId: t }) => [e.id, t])), r = e.comments.map(({ comment: e, paraId: r }) => {
				const n = e.parentId ? t.get(e.parentId) : void 0;
				return `<w15:commentEx w15:paraId="${r}"${n ? ` w15:paraIdParent="${n}"` : ""} w15:done="${e.resolved ? "1" : "0"}"/>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w15:commentsEx ${fo}>${r}</w15:commentsEx>`;
		}(f)));
		for (const w of k) "embedded" === w.kind && w.base64 && t.file(`word/${w.target}`, w.base64, { base64: !0 });
		return t.generateAsync({ type: "arraybuffer" });
	}
	function Es(e) {
		let t = 2166136261;
		for (const r of e) t ^= r, t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	async function Ss(e) {
		return async function(e) {
			const t = await w.default.loadAsync(e), r = {};
			for (const [n, o] of Object.entries(t.files)) o.dir || (r[Zn(n)] = Es(await o.async("uint8array")));
			return r;
		}(await xs(e));
	}
	const Ns = "word/document.xml";
	function ks(e) {
		let t = 2166136261;
		for (let r = 0; r < e.length; r += 1) t ^= e.charCodeAt(r), t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	function _s(e, t) {
		const r = t.overrides[e];
		if (r) return r;
		const n = e.includes(".") ? e.slice(e.lastIndexOf(".") + 1).toLowerCase() : "";
		return t.defaults[n];
	}
	function Ts(e, t) {
		return !(!e.endsWith(".xml") && !e.endsWith(".rels")) || "application/xml" === t || Boolean(t?.endsWith("+xml"));
	}
	async function Is(e) {
		const t = await w.default.loadAsync(e), r = [], n = await t.file("[Content_Types].xml")?.async("string"), o = function(e) {
			const t = {
				defaults: {},
				overrides: {}
			};
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return t;
			for (let n = 0; n < r.childNodes.length; n += 1) {
				const e = r.childNodes[n];
				if (e?.nodeType !== e.ELEMENT_NODE) continue;
				const o = e;
				if ("Default" === o.localName) {
					const e = o.getAttribute("Extension")?.toLowerCase(), r = o.getAttribute("ContentType");
					e && r && (t.defaults[e] = r);
				} else if ("Override" === o.localName) {
					const e = o.getAttribute("PartName"), r = o.getAttribute("ContentType");
					e && r && (t.overrides[Zn(e)] = r);
				}
			}
			return t;
		}(n);
		n || r.push({
			level: "warning",
			code: "missing-content-types",
			message: "The DOCX package does not contain [Content_Types].xml."
		});
		const i = {};
		for (const [l, c] of Object.entries(t.files)) {
			if (c.dir) continue;
			const e = Zn(l), t = _s(e, o), r = Ts(e, t) ? "xml" : "binary", n = "xml" === r ? await c.async("string") : await c.async("base64");
			i[e] = {
				path: e,
				...t ? { contentType: t } : {},
				kind: r,
				data: n,
				encoding: "xml" === r ? "utf8" : "base64",
				originalHash: ks(n)
			};
		}
		let a = [];
		for (const [l, c] of Object.entries(i)) {
			const e = Yn(l);
			if (void 0 === e || "xml" !== c.kind) continue;
			const t = Jn(e, Qn(c.data), (t) => {
				r.push({
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
			const n = i[e];
			n ? n.relationships = t : r.push({
				level: "warning",
				code: "orphan-relationships-part",
				message: `Relationship part ${l} has no owning package part.`,
				partPath: l
			});
		}
		let s = a.find((e) => "External" !== e.targetMode && e.type.endsWith("/officeDocument"))?.resolvedTarget;
		if (!s || !i[s]) {
			if (!i[Ns]) throw new Error("DOCX package has no resolvable officeDocument relationship or word/document.xml fallback.");
			s = Ns, r.push({
				level: "warning",
				code: "main-document-fallback",
				message: "The officeDocument relationship was absent or invalid; word/document.xml was used as a compatibility fallback."
			});
		}
		return {
			format: "docx",
			mainDocumentPart: s,
			contentTypes: o,
			rootRelationships: a,
			parts: i,
			...r.length > 0 ? { diagnostics: r } : {}
		};
	}
	const As = "word/document.xml", Cs = {
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
	function Rs(e) {
		const t = e.lastIndexOf("/"), r = t >= 0 ? e.slice(0, t) : "", n = t >= 0 ? e.slice(t + 1) : e;
		return r ? `${r}/_rels/${n}.rels` : `_rels/${n}.rels`;
	}
	function $s(e, t, r) {
		"base64" === r.encoding ? e.file(t, r.data, { base64: !0 }) : e.file(t, r.data);
	}
	function Ds(e) {
		return `word/__oasis_source__/${e}`;
	}
	function Ps(e) {
		return e ? e.map((e) => "External" !== e.targetMode && e.resolvedTarget ? {
			...e,
			target: `/${Ds(e.resolvedTarget)}`,
			resolvedTarget: void 0
		} : e) : [];
	}
	function Fs(e) {
		for (const [t, r] of Object.entries(Cs)) if (e.type.endsWith(t)) return r;
	}
	async function Ms(e, t) {
		if (!function(e) {
			if (e.mainDocumentPart !== As) return !0;
			const t = e.parts[e.mainDocumentPart];
			return Boolean(t?.relationships?.some((e) => {
				const t = Fs(e);
				return Boolean(t && e.resolvedTarget && e.resolvedTarget !== t);
			}));
		}(t)) return e;
		const r = new w.default();
		for (const i of Object.values(t.parts)) $s(r, i.path, i);
		for (const i of Object.values(t.parts)) {
			if (i.path.endsWith(".rels") || "[Content_Types].xml" === i.path) continue;
			const e = Ds(i.path);
			$s(r, e, i);
			const t = Ps(i.relationships);
			t.length > 0 && r.file(Rs(e), Kn(t));
		}
		const n = t.parts[t.mainDocumentPart];
		if (!n) throw new Error(`DOCX source package is missing its main part: ${t.mainDocumentPart}`);
		$s(r, As, n);
		const o = Ps(n.relationships);
		o.length > 0 && r.file(Rs(As), Kn(o));
		for (const i of n.relationships ?? []) {
			if ("External" === i.targetMode || !i.resolvedTarget) continue;
			const e = Fs(i), n = t.parts[i.resolvedTarget];
			if (!e || !n) continue;
			$s(r, e, n);
			const o = Ps(n.relationships);
			o.length > 0 && r.file(Rs(e), Kn(o));
		}
		return r.generateAsync({ type: "arraybuffer" });
	}
	function Os(e) {
		globalThis.postMessage(e);
	}
	globalThis.addEventListener("message", async (e) => {
		const t = e.data;
		if ("import-docx" === t?.type) try {
			const e = await Is(t.buffer), n = await Gn(await Ms(t.buffer, e), { onProgress: (e, r) => {
				Os({
					type: "progress",
					id: t.id,
					stage: e,
					progress: r
				});
			} });
			await async function(e, t) {
				try {
					t.rebuiltPartHashes = await Ss(e);
				} catch (r) {
					(t.diagnostics ??= []).push({
						level: "warning",
						code: "rebuilt-baseline-unavailable",
						message: `The imported document could not be fingerprinted for granular source-part preservation: ${r instanceof Error ? r.message : String(r)}`
					});
				}
			}(n, e), n.sourcePackage = e, Os({
				type: "done",
				id: t.id,
				document: n
			});
		} catch (r) {
			Os({
				type: "error",
				id: t.id,
				error: r instanceof Error ? r.message : String(r)
			});
		}
	});
})();
