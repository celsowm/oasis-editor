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
						var d, p, f = e.file, h = e.compression, m = u !== s.utf8encode, g = i.transformTo("string", u(f.name)), w = i.transformTo("string", s.utf8encode(f.name)), b = f.comment, v = i.transformTo("string", u(b)), y = i.transformTo("string", s.utf8encode(b)), x = w.length !== f.name.length, E = y.length !== b.length, N = "", S = "", k = "", T = f.dir, I = f.date, _ = {
							crc32: 0,
							compressedSize: 0,
							uncompressedSize: 0
						};
						t && !r || (_.crc32 = e.crc32, _.compressedSize = e.compressedSize, _.uncompressedSize = e.uncompressedSize);
						var C = 0;
						t && (C |= 8), m || !x && !E || (C |= 2048);
						var A = 0, R = 0;
						T && (A |= 16), "UNIX" === a ? (R = 798, A |= function(e, t) {
							var r = e;
							return e || (r = t ? 16893 : 33204), (65535 & r) << 16;
						}(f.unixPermissions, T)) : (R = 20, A |= function(e) {
							return 63 & (e || 0);
						}(f.dosPermissions)), d = I.getUTCHours(), d <<= 6, d |= I.getUTCMinutes(), d <<= 5, d |= I.getUTCSeconds() / 2, p = I.getUTCFullYear() - 1980, p <<= 4, p |= I.getUTCMonth() + 1, p <<= 5, p |= I.getUTCDate(), x && (S = n(1, 1) + n(l(g), 4) + w, N += "up" + n(S.length, 2) + S), E && (k = n(1, 1) + n(l(v), 4) + y, N += "uc" + n(k.length, 2) + k);
						var D = "";
						return D += "\n\0", D += n(C, 2), D += h.magic, D += n(d, 2), D += n(p, 2), D += n(_.crc32, 4), D += n(_.compressedSize, 4), D += n(_.uncompressedSize, 4), D += n(g.length, 2), D += n(N.length, 2), {
							fileRecord: c.LOCAL_FILE_HEADER + D + g + N,
							dirRecord: c.CENTRAL_FILE_HEADER + n(R, 2) + D + n(v.length, 2) + "\0\0\0\0" + n(A, 4) + n(o, 4) + g + N + v
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
					function N(e, t) {
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
					function S(e, t, r, n, o) {
						this.good_length = e, this.max_lazy = t, this.nice_length = r, this.max_chain = n, this.func = o;
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
							e.window_size = 2 * e.w_size, m(e.head), e.max_lazy_match = n[e.level].max_lazy, e.good_match = n[e.level].good_length, e.nice_match = n[e.level].nice_length, e.max_chain_length = n[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = 2, e.match_available = 0, e.ins_h = 0;
						}(e.state), t;
					}
					function _(e, t, r, n, i, a) {
						if (!e) return c;
						var s = 1;
						if (-1 === t && (t = 6), n < 0 ? (s = 0, n = -n) : 15 < n && (s = 2, n -= 16), i < 1 || 9 < i || 8 !== r || n < 8 || 15 < n || t < 0 || 9 < t || a < 0 || 4 < a) return f(e, c);
						8 === n && (n = 9);
						var l = new k();
						return (e.state = l).strm = e, l.wrap = s, l.gzhead = null, l.w_bits = n, l.w_size = 1 << l.w_bits, l.w_mask = l.w_size - 1, l.hash_bits = i + 7, l.hash_size = 1 << l.hash_bits, l.hash_mask = l.hash_size - 1, l.hash_shift = ~~((l.hash_bits + 3 - 1) / 3), l.window = new o.Buf8(2 * l.w_size), l.head = new o.Buf16(l.hash_size), l.prev = new o.Buf16(l.w_size), l.lit_bufsize = 1 << i + 6, l.pending_buf_size = 4 * l.lit_bufsize, l.pending_buf = new o.Buf8(l.pending_buf_size), l.d_buf = 1 * l.lit_bufsize, l.l_buf = 3 * l.lit_bufsize, l.level = t, l.strategy = a, l.method = r, I(e);
					}
					n = [
						new S(0, 0, 0, 0, function(e, t) {
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
						new S(4, 4, 8, 4, E),
						new S(4, 5, 16, 8, E),
						new S(4, 6, 32, 32, E),
						new S(4, 4, 16, 16, N),
						new S(8, 16, 32, 32, N),
						new S(8, 16, 128, 128, N),
						new S(8, 32, 128, 256, N),
						new S(32, 128, 258, 1024, N),
						new S(32, 258, 258, 4096, N)
					], r.deflateInit = function(e, t) {
						return _(e, t, 8, 15, 8, 0);
					}, r.deflateInit2 = _, r.deflateReset = I, r.deflateResetKeep = T, r.deflateSetHeader = function(e, t) {
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
						var r, n, o, i, a, s, l, c, u, d, p, f, h, m, g, w, b, v, y, x, E, N, S = e.state, k = e.next_in, T = e.input;
						r = k + (e.avail_in - 5), n = e.next_out, N = e.output, o = n - (t - e.avail_out), i = n + (e.avail_out - 257), a = S.dmax, s = S.wsize, l = S.whave, c = S.wnext, u = S.window, d = S.hold, p = S.bits, f = S.lencode, h = S.distcode, m = (1 << S.lenbits) - 1, g = (1 << S.distbits) - 1;
						e: do {
							p < 15 && (d += T[k++] << p, p += 8, d += T[k++] << p, p += 8), w = f[d & m];
							t: for (;;) {
								if (d >>>= b = w >>> 24, p -= b, 0 == (b = w >>> 16 & 255)) N[n++] = 65535 & w;
								else {
									if (!(16 & b)) {
										if (!(64 & b)) {
											w = f[(65535 & w) + (d & (1 << b) - 1)];
											continue t;
										}
										if (32 & b) {
											S.mode = 12;
											break e;
										}
										e.msg = "invalid literal/length code", S.mode = 30;
										break e;
									}
									v = 65535 & w, (b &= 15) && (p < b && (d += T[k++] << p, p += 8), v += d & (1 << b) - 1, d >>>= b, p -= b), p < 15 && (d += T[k++] << p, p += 8, d += T[k++] << p, p += 8), w = h[d & g];
									r: for (;;) {
										if (d >>>= b = w >>> 24, p -= b, !(16 & (b = w >>> 16 & 255))) {
											if (!(64 & b)) {
												w = h[(65535 & w) + (d & (1 << b) - 1)];
												continue r;
											}
											e.msg = "invalid distance code", S.mode = 30;
											break e;
										}
										if (y = 65535 & w, p < (b &= 15) && (d += T[k++] << p, (p += 8) < b && (d += T[k++] << p, p += 8)), a < (y += d & (1 << b) - 1)) {
											e.msg = "invalid distance too far back", S.mode = 30;
											break e;
										}
										if (d >>>= b, p -= b, (b = n - o) < y) {
											if (l < (b = y - b) && S.sane) {
												e.msg = "invalid distance too far back", S.mode = 30;
												break e;
											}
											if (E = u, (x = 0) === c) {
												if (x += s - b, b < v) {
													for (v -= b; N[n++] = u[x++], --b;);
													x = n - y, E = N;
												}
											} else if (c < b) {
												if (x += s + c - b, (b -= c) < v) {
													for (v -= b; N[n++] = u[x++], --b;);
													if (x = 0, c < v) {
														for (v -= b = c; N[n++] = u[x++], --b;);
														x = n - y, E = N;
													}
												}
											} else if (x += c - b, b < v) {
												for (v -= b; N[n++] = u[x++], --b;);
												x = n - y, E = N;
											}
											for (; 2 < v;) N[n++] = E[x++], N[n++] = E[x++], N[n++] = E[x++], v -= 3;
											v && (N[n++] = E[x++], 1 < v && (N[n++] = E[x++]));
										} else {
											for (x = n - y; N[n++] = N[x++], N[n++] = N[x++], N[n++] = N[x++], 2 < (v -= 3););
											v && (N[n++] = N[x++], 1 < v && (N[n++] = N[x++]));
										}
										break;
									}
								}
								break;
							}
						} while (k < r && n < i);
						k -= v = p >> 3, d &= (1 << (p -= v << 3)) - 1, e.next_in = k, e.next_out = n, e.avail_in = k < r ? r - k + 5 : 5 - (k - r), e.avail_out = n < i ? i - n + 257 : 257 - (n - i), S.hold = d, S.bits = p;
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
						var r, u, d, p, f, h, m, g, w, y, x, E, N, S, k, T, I, _, C, A, R, D, $, P, M = 0, O = new n.Buf8(4), F = [
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
						12 === (r = e.state).mode && (r.mode = 13), f = e.next_out, d = e.output, m = e.avail_out, p = e.next_in, u = e.input, h = e.avail_in, g = r.hold, w = r.bits, y = h, x = m, D = 0;
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
									O[r.check = 0] = 255 & g, O[1] = g >>> 8 & 255, r.check = i(r.check, O, 2, 0), w = g = 0, r.mode = 2;
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
								r.head && (r.head.text = g >> 8 & 1), 512 & r.flags && (O[0] = 255 & g, O[1] = g >>> 8 & 255, r.check = i(r.check, O, 2, 0)), w = g = 0, r.mode = 3;
							case 3:
								for (; w < 32;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								r.head && (r.head.time = g), 512 & r.flags && (O[0] = 255 & g, O[1] = g >>> 8 & 255, O[2] = g >>> 16 & 255, O[3] = g >>> 24 & 255, r.check = i(r.check, O, 4, 0)), w = g = 0, r.mode = 4;
							case 4:
								for (; w < 16;) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								r.head && (r.head.xflags = 255 & g, r.head.os = g >> 8), 512 & r.flags && (O[0] = 255 & g, O[1] = g >>> 8 & 255, r.check = i(r.check, O, 2, 0)), w = g = 0, r.mode = 5;
							case 5:
								if (1024 & r.flags) {
									for (; w < 16;) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									r.length = g, r.head && (r.head.extra_len = g), 512 & r.flags && (O[0] = 255 & g, O[1] = g >>> 8 & 255, r.check = i(r.check, O, 2, 0)), w = g = 0;
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
									r.lens[F[r.have++]] = 7 & g, g >>>= 3, w -= 3;
								}
								for (; r.have < 19;) r.lens[F[r.have++]] = 0;
								if (r.lencode = r.lendyn, r.lenbits = 7, $ = { bits: r.lenbits }, D = s(0, r.lens, 0, 19, r.lencode, 0, r.work, $), r.lenbits = $.bits, D) {
									e.msg = "invalid code lengths set", r.mode = 30;
									break;
								}
								r.have = 0, r.mode = 19;
							case 19:
								for (; r.have < r.nlen + r.ndist;) {
									for (; T = (M = r.lencode[g & (1 << r.lenbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									if (I < 16) g >>>= k, w -= k, r.lens[r.have++] = I;
									else {
										if (16 === I) {
											for (P = k + 2; w < P;) {
												if (0 === h) break e;
												h--, g += u[p++] << w, w += 8;
											}
											if (g >>>= k, w -= k, 0 === r.have) {
												e.msg = "invalid bit length repeat", r.mode = 30;
												break;
											}
											R = r.lens[r.have - 1], E = 3 + (3 & g), g >>>= 2, w -= 2;
										} else if (17 === I) {
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
								if (r.lenbits = 9, $ = { bits: r.lenbits }, D = s(1, r.lens, 0, r.nlen, r.lencode, 0, r.work, $), r.lenbits = $.bits, D) {
									e.msg = "invalid literal/lengths set", r.mode = 30;
									break;
								}
								if (r.distbits = 6, r.distcode = r.distdyn, $ = { bits: r.distbits }, D = s(2, r.lens, r.nlen, r.ndist, r.distcode, 0, r.work, $), r.distbits = $.bits, D) {
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
								for (r.back = 0; T = (M = r.lencode[g & (1 << r.lenbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (T && !(240 & T)) {
									for (_ = k, C = T, A = I; T = (M = r.lencode[A + ((g & (1 << _ + C) - 1) >> _)]) >>> 16 & 255, I = 65535 & M, !(_ + (k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= _, w -= _, r.back += _;
								}
								if (g >>>= k, w -= k, r.back += k, r.length = I, 0 === T) {
									r.mode = 26;
									break;
								}
								if (32 & T) {
									r.back = -1, r.mode = 12;
									break;
								}
								if (64 & T) {
									e.msg = "invalid literal/length code", r.mode = 30;
									break;
								}
								r.extra = 15 & T, r.mode = 22;
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
								for (; T = (M = r.distcode[g & (1 << r.distbits) - 1]) >>> 16 & 255, I = 65535 & M, !((k = M >>> 24) <= w);) {
									if (0 === h) break e;
									h--, g += u[p++] << w, w += 8;
								}
								if (!(240 & T)) {
									for (_ = k, C = T, A = I; T = (M = r.distcode[A + ((g & (1 << _ + C) - 1) >> _)]) >>> 16 & 255, I = 65535 & M, !(_ + (k = M >>> 24) <= w);) {
										if (0 === h) break e;
										h--, g += u[p++] << w, w += 8;
									}
									g >>>= _, w -= _, r.back += _;
								}
								if (g >>>= k, w -= k, r.back += k, 64 & T) {
									e.msg = "invalid distance code", r.mode = 30;
									break;
								}
								r.offset = I, r.extra = 15 & T, r.mode = 24;
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
									N = E > r.wnext ? (E -= r.wnext, r.wsize - E) : r.wnext - E, E > r.length && (E = r.length), S = r.window;
								} else S = d, N = f - r.offset, E = r.length;
								for (m < E && (E = m), m -= E, r.length -= E; d[f++] = S[N++], --E;);
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
								D = 1;
								break e;
							case 30:
								D = -3;
								break e;
							case 31: return -4;
							default: return l;
						}
						return e.next_out = f, e.avail_out = m, e.next_in = p, e.avail_in = h, r.hold = g, r.bits = w, (r.wsize || x !== e.avail_out && r.mode < 30 && (r.mode < 27 || 4 !== t)) && v(e, e.output, e.next_out, x - e.avail_out) ? (r.mode = 31, -4) : (y -= e.avail_in, x -= e.avail_out, e.total_in += y, e.total_out += x, r.total += x, r.wrap && x && (e.adler = r.check = r.flags ? i(r.check, d, x, e.next_out - x) : o(r.check, d, x, e.next_out - x)), e.data_type = r.bits + (r.last ? 64 : 0) + (12 === r.mode ? 128 : 0) + (20 === r.mode || 15 === r.mode ? 256 : 0), (0 == y && 0 === x || 4 === t) && 0 === D && (D = -5), D);
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
						var f, h, m, g, w, b, v, y, x, E = p.bits, N = 0, S = 0, k = 0, T = 0, I = 0, _ = 0, C = 0, A = 0, R = 0, D = 0, $ = null, P = 0, M = new n.Buf16(16), O = new n.Buf16(16), F = null, L = 0;
						for (N = 0; N <= 15; N++) M[N] = 0;
						for (S = 0; S < l; S++) M[t[r + S]]++;
						for (I = E, T = 15; 1 <= T && 0 === M[T]; T--);
						if (T < I && (I = T), 0 === T) return c[u++] = 20971520, c[u++] = 20971520, p.bits = 1, 0;
						for (k = 1; k < T && 0 === M[k]; k++);
						for (I < k && (I = k), N = A = 1; N <= 15; N++) if (A <<= 1, (A -= M[N]) < 0) return -1;
						if (0 < A && (0 === e || 1 !== T)) return -1;
						for (O[1] = 0, N = 1; N < 15; N++) O[N + 1] = O[N] + M[N];
						for (S = 0; S < l; S++) 0 !== t[r + S] && (d[O[t[r + S]]++] = S);
						if (b = 0 === e ? ($ = F = d, 19) : 1 === e ? ($ = o, P -= 257, F = i, L -= 257, 256) : ($ = a, F = s, -1), N = k, w = u, C = S = D = 0, m = -1, g = (R = 1 << (_ = I)) - 1, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
						for (;;) {
							for (v = N - C, x = d[S] < b ? (y = 0, d[S]) : d[S] > b ? (y = F[L + d[S]], $[P + d[S]]) : (y = 96, 0), f = 1 << N - C, k = h = 1 << _; c[w + (D >> C) + (h -= f)] = v << 24 | y << 16 | x, 0 !== h;);
							for (f = 1 << N - 1; D & f;) f >>= 1;
							if (0 !== f ? (D &= f - 1, D += f) : D = 0, S++, 0 == --M[N]) {
								if (N === T) break;
								N = t[r + d[S]];
							}
							if (I < N && (D & g) !== m) {
								for (0 === C && (C = I), w += k, A = 1 << (_ = N - C); _ + C < T && !((A -= M[_ + C]) <= 0);) _++, A <<= 1;
								if (R += 1 << _, 1 === e && 852 < R || 2 === e && 592 < R) return 1;
								c[m = D & g] = I << 24 | _ << 16 | w - u;
							}
						}
						return 0 !== D && (c[w + D] = N - C << 24 | 4194304), p.bits = I, 0;
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
					function N(e, t) {
						this.dyn_tree = e, this.max_code = 0, this.stat_desc = t;
					}
					function S(e) {
						return e < 256 ? m[e] : m[256 + (e >>> 7)];
					}
					function k(e, t) {
						e.pending_buf[e.pending++] = 255 & t, e.pending_buf[e.pending++] = t >>> 8 & 255;
					}
					function T(e, t, r) {
						e.bi_valid > 16 - r ? (e.bi_buf |= t << e.bi_valid & 65535, k(e, e.bi_buf), e.bi_buf = t >> 16 - e.bi_valid, e.bi_valid += r - 16) : (e.bi_buf |= t << e.bi_valid & 65535, e.bi_valid += r);
					}
					function I(e, t, r) {
						T(e, r[2 * t], r[2 * t + 1]);
					}
					function _(e, t) {
						for (var r = 0; r |= 1 & e, e >>>= 1, r <<= 1, 0 < --t;);
						return r >>> 1;
					}
					function C(e, t, r) {
						var n, o, i = new Array(16), a = 0;
						for (n = 1; n <= l; n++) i[n] = a = a + r[n - 1] << 1;
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
					function D(e, t, r, n) {
						var o = 2 * t, i = 2 * r;
						return e[o] < e[i] || e[o] === e[i] && n[t] <= n[r];
					}
					function $(e, t, r) {
						for (var n = e.heap[r], o = r << 1; o <= e.heap_len && (o < e.heap_len && D(t, e.heap[o + 1], e.heap[o], e.depth) && o++, !D(t, n, e.heap[o], e.depth));) e.heap[r] = e.heap[o], r = o, o <<= 1;
						e.heap[r] = n;
					}
					function P(e, t, r) {
						var n, o, a, s, l = 0;
						if (0 !== e.last_lit) for (; n = e.pending_buf[e.d_buf + 2 * l] << 8 | e.pending_buf[e.d_buf + 2 * l + 1], o = e.pending_buf[e.l_buf + l], l++, 0 === n ? I(e, o, t) : (I(e, (a = g[o]) + i + 1, t), 0 !== (s = c[a]) && T(e, o -= w[a], s), I(e, a = S(--n), r), 0 !== (s = u[a]) && T(e, n -= x[a], s)), l < e.last_lit;);
						I(e, 256, t);
					}
					function M(e, t) {
						var r, n, o, i = t.dyn_tree, a = t.stat_desc.static_tree, s = t.stat_desc.has_stree, c = t.stat_desc.elems, u = -1;
						for (e.heap_len = 0, e.heap_max = 573, r = 0; r < c; r++) 0 !== i[2 * r] ? (e.heap[++e.heap_len] = u = r, e.depth[r] = 0) : i[2 * r + 1] = 0;
						for (; e.heap_len < 2;) i[2 * (o = e.heap[++e.heap_len] = u < 2 ? ++u : 0)] = 1, e.depth[o] = 0, e.opt_len--, s && (e.static_len -= a[2 * o + 1]);
						for (t.max_code = u, r = e.heap_len >> 1; 1 <= r; r--) $(e, i, r);
						for (o = c; r = e.heap[1], e.heap[1] = e.heap[e.heap_len--], $(e, i, 1), n = e.heap[1], e.heap[--e.heap_max] = r, e.heap[--e.heap_max] = n, i[2 * o] = i[2 * r] + i[2 * n], e.depth[o] = (e.depth[r] >= e.depth[n] ? e.depth[r] : e.depth[n]) + 1, i[2 * r + 1] = i[2 * n + 1] = o, e.heap[1] = o++, $(e, i, 1), 2 <= e.heap_len;);
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
						}(e, t), C(i, u, e.bl_count);
					}
					function O(e, t, r) {
						var n, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), t[2 * (r + 1) + 1] = 65535, n = 0; n <= r; n++) o = a, a = t[2 * (n + 1) + 1], ++s < l && o === a || (s < c ? e.bl_tree[2 * o] += s : 0 !== o ? (o !== i && e.bl_tree[2 * o]++, e.bl_tree[32]++) : s <= 10 ? e.bl_tree[34]++ : e.bl_tree[36]++, i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4));
					}
					function F(e, t, r) {
						var n, o, i = -1, a = t[1], s = 0, l = 7, c = 4;
						for (0 === a && (l = 138, c = 3), n = 0; n <= r; n++) if (o = a, a = t[2 * (n + 1) + 1], !(++s < l && o === a)) {
							if (s < c) for (; I(e, o, e.bl_tree), 0 != --s;);
							else 0 !== o ? (o !== i && (I(e, o, e.bl_tree), s--), I(e, 16, e.bl_tree), T(e, s - 3, 2)) : s <= 10 ? (I(e, 17, e.bl_tree), T(e, s - 3, 3)) : (I(e, 18, e.bl_tree), T(e, s - 11, 7));
							i = o, c = (s = 0) === a ? (l = 138, 3) : o === a ? (l = 6, 3) : (l = 7, 4);
						}
					}
					o(x);
					var L = !1;
					function B(e, t, r, o) {
						T(e, 0 + (o ? 1 : 0), 3), function(e, t, r) {
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
							for (C(f, 287, i), e = 0; e < s; e++) h[2 * e + 1] = 5, h[2 * e] = _(e, 5);
							b = new E(f, c, 257, a, l), v = new E(h, u, 0, s, l), y = new E(new Array(0), d, 0, 19, 7);
						}(), L = !0), e.l_desc = new N(e.dyn_ltree, b), e.d_desc = new N(e.dyn_dtree, v), e.bl_desc = new N(e.bl_tree, y), e.bi_buf = 0, e.bi_valid = 0, A(e);
					}, r._tr_stored_block = B, r._tr_flush_block = function(e, t, r, n) {
						var o, a, s = 0;
						0 < e.level ? (2 === e.strm.data_type && (e.strm.data_type = function(e) {
							var t, r = 4093624447;
							for (t = 0; t <= 31; t++, r >>>= 1) if (1 & r && 0 !== e.dyn_ltree[2 * t]) return 0;
							if (0 !== e.dyn_ltree[18] || 0 !== e.dyn_ltree[20] || 0 !== e.dyn_ltree[26]) return 1;
							for (t = 32; t < i; t++) if (0 !== e.dyn_ltree[2 * t]) return 1;
							return 0;
						}(e)), M(e, e.l_desc), M(e, e.d_desc), s = function(e) {
							var t;
							for (O(e, e.dyn_ltree, e.l_desc.max_code), O(e, e.dyn_dtree, e.d_desc.max_code), M(e, e.bl_desc), t = 18; 3 <= t && 0 === e.bl_tree[2 * p[t] + 1]; t--);
							return e.opt_len += 3 * (t + 1) + 5 + 5 + 4, t;
						}(e), o = e.opt_len + 3 + 7 >>> 3, (a = e.static_len + 3 + 7 >>> 3) <= o && (o = a)) : o = a = r + 5, r + 4 <= o && -1 !== t ? B(e, t, r, n) : 4 === e.strategy || a === o ? (T(e, 2 + (n ? 1 : 0), 3), P(e, f, h)) : (T(e, 4 + (n ? 1 : 0), 3), function(e, t, r, n) {
							var o;
							for (T(e, t - 257, 5), T(e, r - 1, 5), T(e, n - 4, 4), o = 0; o < n; o++) T(e, e.bl_tree[2 * p[o] + 1], 3);
							F(e, e.dyn_ltree, t - 1), F(e, e.dyn_dtree, r - 1);
						}(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, s + 1), P(e, e.dyn_ltree, e.dyn_dtree)), A(e), n && R(e);
					}, r._tr_tally = function(e, t, r) {
						return e.pending_buf[e.d_buf + 2 * e.last_lit] = t >>> 8 & 255, e.pending_buf[e.d_buf + 2 * e.last_lit + 1] = 255 & t, e.pending_buf[e.l_buf + e.last_lit] = 255 & r, e.last_lit++, 0 === t ? e.dyn_ltree[2 * r]++ : (e.matches++, t--, e.dyn_ltree[2 * (g[r] + i + 1)]++, e.dyn_dtree[2 * S(t)]++), e.last_lit === e.lit_bufsize - 1;
					}, r._tr_align = function(e) {
						T(e, 2, 3), I(e, 256, f), function(e) {
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
		var h = i("[", n(f), n(/[-.0-9\xB7]/), n(/[\u0300-\u036F\u203F-\u2040]/), "]"), m = i(f, h, "*"), g = i("^", m, "$"), w = i(h, "+"), b = a(i("&", m, ";"), "|", a(/&#[0-9]+;|&#x[0-9a-fA-F]+;/)), v = i("%", m, ";"), y = a(i("\"", a(/[^%&"]/, "|", v, "|", b), "*", "\""), "|", i("'", a(/[^%&']/, "|", v, "|", b), "*", "'")), x = a("\"", a(/[^<&"]/, "|", b), "*", "\"", "|", "'", a(/[^<&']/, "|", b), "*", "'"), E = i(o(f, ":"), o(h, ":"), "*"), N = i("^", E, "$"), S = i(E, a(":", E), "?"), k = i("^", S, "$"), T = i("(", S, ")"), I = a(/"[^"]*"|'[^']*'/), _ = i(/^<\?/, "(", m, ")", a(d, "(?!", c, ")(", s, "*?)"), "?", /\?>/), C = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/, A = a("\"", C, "*\"", "|", "'", o(C, "'"), "*'"), R = "<!--", D = i(R, a(o(s, "-"), "|", i("-", o(s, "-"))), "*", "-->"), $ = "#PCDATA", P = a("EMPTY", "|", "ANY", "|", a(i(/\(/, p, $, a(p, /\|/, p, S), "*", p, /\)\*/), "|", i(/\(/, p, $, p, /\)/)), "|", i(/\([^>]+\)/, /[?*+]?/)), M = i("<!ELEMENT", d, a(S, "|", v), d, a(P, "|", v), p, ">"), O = i("<!ATTLIST", d, m, a(d, m, d, a(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", a(i("NOTATION", d, /\(/, p, m, a(p, /\|/, p, m), "*", p, /\)/), "|", i(/\(/, p, w, a(p, /\|/, p, w), "*", p, /\)/))), d, a(/#REQUIRED|#IMPLIED/, "|", a(a("#FIXED", d), "?", x))), "*", p, ">"), F = "about:legacy-compat", L = a("\"" + F + "\"", "|", "'" + F + "'"), B = "SYSTEM", U = "PUBLIC", z = a(a(B, d, I), "|", a(U, d, A, d, I)), H = i("^", a(a(B, d, "(?<SystemLiteralOnly>", I, ")"), "|", a(U, d, "(?<PubidLiteral>", A, ")", d, "(?<SystemLiteral>", I, ")"))), j = i("^", A, "$"), q = i("^", I, "$"), W = a(y, "|", a(z, a(d, "NDATA", d, m), "?")), V = "<!ENTITY", G = a(i(V, d, m, d, W, p, ">"), "|", i(V, d, "%", d, m, d, a(y, "|", z), p, ">")), X = i("<!NOTATION", d, m, d, a(z, "|", i(U, d, A)), p, ">"), Z = i(p, "=", p), Y = /1[.]\d+/, Q = i(d, "version", Z, a("'", Y, "'", "|", "\"", Y, "\"")), K = /[A-Za-z][-A-Za-z0-9._]*/, J = i(/^<\?xml/, Q, a(d, "encoding", Z, a("\"", K, "\"", "|", "'", K, "'")), "?", a(d, "standalone", Z, a("'", a("yes", "|", "no"), "'", "|", "\"", a("yes", "|", "no"), "\"")), "?", p, /\?>/), ee = i(/<!\[CDATA\[/, i(s, "*?", /\]\]>/));
		e.chars = n, e.chars_without = o, e.detectUnicodeSupport = t, e.reg = i, e.regg = a, e.ABOUT_LEGACY_COMPAT = F, e.ABOUT_LEGACY_COMPAT_SystemLiteral = L, e.AttlistDecl = O, e.CDATA_START = "<![CDATA[", e.CDATA_END = "]]>", e.CDSect = ee, e.Char = s, e.Comment = D, e.COMMENT_START = R, e.COMMENT_END = "-->", e.DOCTYPE_DECL_START = "<!DOCTYPE", e.elementdecl = M, e.EntityDecl = G, e.EntityValue = y, e.ExternalID = z, e.ExternalID_match = H, e.Name = m, e.Name_exact = g, e.NCName_exact = N, e.NotationDecl = X, e.Reference = b, e.PEReference = v, e.PI = _, e.PUBLIC = U, e.PubidLiteral = A, e.PubidLiteral_match = j, e.QName = S, e.QName_exact = k, e.QName_group = T, e.S = d, e.SChar_s = u, e.S_OPT = p, e.SYSTEM = B, e.SystemLiteral = I, e.SystemLiteral_match = q, e.InvalidChar = l, e.UNICODE_REPLACEMENT_CHARACTER = "�", e.UNICODE_SUPPORT = r, e.XMLDecl = J;
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
		function N(e, r) {
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
		function S(e, t) {
			for (var r in e) o(e, r) && (t[r] = e[r]);
		}
		function k(e, t) {
			var r = e.prototype;
			if (!(r instanceof t)) {
				function n() {}
				n.prototype = t.prototype, S(r, n = new n()), e.prototype = r = n;
			}
			r.constructor != e && ("function" != typeof e && console.error("unknown Class:" + e), r.constructor = e);
		}
		var T = {}, I = T.ELEMENT_NODE = 1, _ = T.ATTRIBUTE_NODE = 2, C = T.TEXT_NODE = 3, A = T.CDATA_SECTION_NODE = 4, R = T.ENTITY_REFERENCE_NODE = 5, D = T.ENTITY_NODE = 6, $ = T.PROCESSING_INSTRUCTION_NODE = 7, P = T.COMMENT_NODE = 8, M = T.DOCUMENT_NODE = 9, O = T.DOCUMENT_TYPE_NODE = 10, F = T.DOCUMENT_FRAGMENT_NODE = 11, L = T.NOTATION_NODE = 12, B = t.freeze({
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
				if (De(e, "length", r.length), !e.$$length || r.length < e.$$length) for (var n = r.length; n in e; n++) o(e, n) && delete e[n];
				S(r, e), e._inc = t;
			}
		}
		function W() {
			this._nsIndex = Object.create(null), this._noNsIndex = Object.create(null);
		}
		function V(e, t) {
			for (var r = 0; r < e.length;) {
				if (e[r] === t) return r;
				r++;
			}
		}
		function G(e, t, r) {
			if (!t) return e._noNsIndex;
			var n = e._nsIndex[t];
			return !n && r && (n = e._nsIndex[t] = Object.create(null)), n;
		}
		function X(e, t, r, n) {
			if (n ? t[V(t, n)] = r : (t[t.length] = r, t.length++), function(e, t) {
				G(e, t.namespaceURI, !0)[t.localName] = t;
			}(t, r), e) {
				r.ownerElement = e;
				var o = e.ownerDocument;
				o && (n && re(o, e, n), function(e, t, r) {
					e && e._inc++, r.namespaceURI === p.XMLNS && (t._nsMap[r.prefix ? r.localName : ""] = r.value);
				}(o, e, r));
			}
		}
		function Z(e, t, r) {
			var n = V(t, r);
			if (n >= 0) {
				for (var o = t.length - 1; n <= o;) t[n] = t[++n];
				if (t.length = o, function(e, t) {
					var r = G(e, t.namespaceURI, !1);
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
			if (o && o.removeChild(t), t.nodeType === F) {
				var i = t.firstChild;
				if (null == i) return t;
				var a = t.lastChild;
			} else i = a = t;
			var s = r ? r.previousSibling : e.lastChild;
			i.previousSibling = s, a.nextSibling = r, s ? s.nextSibling = i : e.firstChild = i, null == r ? e.lastChild = a : r.previousSibling = a;
			do
				i.parentNode = e;
			while (i !== a && (i = i.nextSibling));
			return ne(e.ownerDocument || e, e, t), t.nodeType == F && (t.firstChild = t.lastChild = null), t;
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
		function Ne(e) {
			b(e);
		}
		function Se(e) {
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
			var r = [], n = this.nodeType === M && this.documentElement || this, o = n.prefix, i = n.namespaceURI;
			if (i && null == o && null == (o = n.lookupPrefix(i))) var a = [{
				namespace: i,
				prefix: null
			}];
			return Ae(this, r, a, t), r.join("");
		}
		function _e(e, t, r) {
			var n = e.prefix || "", o = e.namespaceURI;
			if (!o) return !1;
			if ("xml" === n && o === p.XML || o === p.XMLNS) return !1;
			for (var i = r.length; i--;) {
				var a = r[i];
				if (a.prefix === n) return a.namespace !== o;
			}
			return !0;
		}
		function Ce(e, t, r, n) {
			if (n && !w.QName_exact.test(t)) throw new m("The attribute name \"" + t + "\" is not a valid XML QName", g.InvalidStateError);
			e.push(" ", t, "=\"", r.replace(/[<>&"\t\n\r]/g, K), "\"");
		}
		function Ae(e, t, r, n) {
			r || (r = []);
			var o = n.nodeFilter, i = n.requireWellFormed, l = n.splitCDATASections, c = "html" === (e.nodeType === M ? e : e.ownerDocument).type;
			ee(e, { ns: r }, {
				enter: function(e, r) {
					var u = r.ns;
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
							for (var N = u.slice(), S = 0; S < f; S++) "xmlns" == (k = d.item(S)).prefix ? N.push({
								prefix: k.localName,
								namespace: k.value
							}) : "xmlns" == k.nodeName && N.push({
								prefix: "",
								namespace: k.value
							});
							for (S = 0; S < f; S++) {
								var k;
								if (_e(k = d.item(S), 0, N)) {
									var T = k.prefix || "", D = k.namespaceURI;
									Ce(t, T ? "xmlns:" + T : "xmlns", D, i), N.push({
										prefix: T,
										namespace: D
									});
								}
								var L = o ? o(k) : k;
								L && ("string" == typeof L ? t.push(L) : Ce(t, L.name, L.value, i));
							}
							if (h === b && _e(e, 0, N)) {
								var B = e.prefix || "";
								D = e.namespaceURI;
								Ce(t, B ? "xmlns:" + B : "xmlns", D, i), N.push({
									prefix: B,
									namespace: D
								});
							}
							var U = !e.firstChild;
							if (U && (c || e.namespaceURI === p.HTML) && (U = s(h)), U) return t.push("/>"), null;
							if (t.push(">"), c && a(h)) {
								for (var z = e.firstChild; z;) z.data ? t.push(z.data) : Ae(z, t, N.slice(), n), z = z.nextSibling;
								return t.push("</", b, ">"), null;
							}
							return {
								ns: N,
								tag: b
							};
						case M:
						case F:
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
						case O:
							var H = e.publicId, j = e.systemId;
							if (i) {
								if (!w.Name_exact.test(e.name)) throw new m("The doctype name \"" + e.name + "\" is not a valid XML Name", g.InvalidStateError);
								if (H && !w.PubidLiteral_match.test(H)) throw new m("DocumentType publicId is not a valid PubidLiteral", g.InvalidStateError);
								if (j && "." !== j && !w.SystemLiteral_match.test(j)) throw new m("DocumentType systemId is not a valid SystemLiteral", g.InvalidStateError);
								if (e.internalSubset && -1 !== e.internalSubset.indexOf("]>")) throw new m("DocumentType internalSubset contains \"]>\"", g.InvalidStateError);
							}
							return t.push(w.DOCTYPE_DECL_START, " ", e.name), H ? (t.push(" ", w.PUBLIC, " ", H), j && "." !== j && t.push(" ", j)) : j && "." !== j && t.push(" ", w.SYSTEM, " ", j), e.internalSubset && t.push(" [", e.internalSubset, "]"), t.push(">"), null;
						case $:
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
					case I:
						var u = t.attributes, d = a.attributes = new W(), p = u.length;
						d._ownerElement = a;
						for (var h = 0; h < p; h++) a.setAttributeNode(Re(e, u.item(h), !0));
						break;
					case _: c = !0;
				}
				return null !== i ? i.appendChild(a) : n = a, c ? a : null;
			} }), n;
		}
		function De(e, t, r) {
			e[t] = r;
		}
		function $e(e) {
			for (var t = [], r = e.firstChild; r;) r.nodeType === I && t.push(r), r = r.nextSibling;
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
				for (var r = [], n = 0; n < this.length; n++) Ae(this[n], r, null, t);
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
				var r, n, o, i, a = (r = this, n = e.namespaceURI, o = e.localName, (i = G(r, n, !1)) && i[o] || null);
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
						if (null !== r && r.nodeType === C && t.nodeType === C) {
							for (var n = [], o = r; null !== o && o.nodeType === C;) n.push(o.data), o = o.nextSibling;
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
					t = t.nodeType == _ ? t.ownerDocument : t.parentNode;
				}
				return null;
			},
			lookupNamespaceURI: function(e) {
				for (var t = this; t;) {
					var r = t._nsMap;
					if (r && o(r, e)) return r[e];
					t = t.nodeType == _ ? t.ownerDocument : t.parentNode;
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
		}, S(T, Q), S(T, Q.prototype), S(B, Q), S(B, Q.prototype), ee.STOP = Symbol("walkDOM.STOP"), ee.ENTER = 0, ee.EXIT = 1, te.prototype = {
			implementation: null,
			nodeName: "#document",
			nodeType: M,
			doctype: null,
			documentElement: null,
			_inc: 1,
			insertBefore: function(e, t) {
				if (e.nodeType === F) {
					for (var r = e.firstChild; r;) {
						var n = r.nextSibling;
						this.insertBefore(r, t), r = n;
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
				return function(e, t, r) {
					var n;
					return ee(t, null, { enter: function(t, o) {
						var i = t.cloneNode(!1);
						return i.ownerDocument = e, i.parentNode = null, null === o ? n = i : o.appendChild(i), t.nodeType === _ || r ? i : null;
					} }), n;
				}(this, e, t);
			},
			getElementById: function(e) {
				var t = null;
				return J(this.documentElement, function(r) {
					if (r.nodeType == I && r.getAttribute("id") == e) return t = r, !0;
				}), t;
			},
			createElement: function(e) {
				var t = new he(f);
				return t.ownerDocument = this, "html" === this.type && (e = e.toLowerCase()), n(this.contentType) && (t.namespaceURI = p.HTML), t.nodeName = e, t.tagName = e, t.localName = e, t.childNodes = new H(), (t.attributes = new W())._ownerElement = t, t;
			},
			createDocumentFragment: function() {
				var e = new Se(f);
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
				var t = new Ne(f);
				return t.ownerDocument = this, t.childNodes = new H(), t.nodeName = e, t;
			},
			createElementNS: function(e, t) {
				var r = N(e, t), n = new he(f), o = n.attributes = new W();
				return n.childNodes = new H(), n.ownerDocument = this, n.nodeName = t, n.tagName = t, n.namespaceURI = r[0], n.prefix = r[1], n.localName = r[2], o._ownerElement = n, n;
			},
			createAttributeNS: function(e, t) {
				var r = N(e, t), n = new me(f);
				return n.ownerDocument = this, n.childNodes = new H(), n.nodeName = t, n.name = t, n.specified = !0, n.namespaceURI = r[0], n.prefix = r[1], n.localName = r[2], n;
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
				var n = N(e, t)[2], o = this.getAttributeNodeNS(e, n);
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
						if (o !== r && o.nodeType === I) {
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
				var t = "html" === (this.nodeType === M ? this : this.ownerDocument).type, r = e.toLowerCase();
				return new j(this, function(n) {
					var o = [];
					return J(n, function(i) {
						i !== n && i.nodeType === I && ("*" === e || i.getQualifiedName() === (t && i.namespaceURI === p.HTML ? r : e)) && o.push(i);
					}), o;
				});
			},
			getElementsByTagNameNS: function(e, t) {
				return new j(this, function(r) {
					var n = [];
					return J(r, function(o) {
						o === r || o.nodeType !== I || "*" !== e && o.namespaceURI !== e || "*" !== t && o.localName != t || n.push(o);
					}), n;
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
			replaceData: function(e, t, r) {
				r = this.data.substring(0, e) + r + this.data.substring(e + t), this.nodeValue = this.data = r, this.length = r.length;
			}
		}, k(ge, Q), we.prototype = {
			nodeName: "#text",
			nodeType: C,
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
			nodeType: A
		}, k(ve, we), ye.prototype.nodeType = O, k(ye, Q), xe.prototype.nodeType = L, k(xe, Q), Ee.prototype.nodeType = D, k(Ee, Q), Ne.prototype.nodeType = R, k(Ne, Q), Se.prototype.nodeName = "#document-fragment", Se.prototype.nodeType = F, k(Se, Q), ke.prototype.nodeType = $, k(ke, ge), Te.prototype.serializeToString = function(e, t) {
			return Ie.call(e, t);
		}, Q.prototype.toString = Ie;
		try {
			Object.defineProperty && (Object.defineProperty(j.prototype, "length", { get: function() {
				return q(this), this.$$length;
			} }), Object.defineProperty(Q.prototype, "textContent", {
				get: function() {
					if (this.nodeType === I || this.nodeType === F) {
						var e = [];
						return ee(this, null, { enter: function(t) {
							return t.nodeType === I || t.nodeType === F || (t.nodeType === $ || t.nodeType === P ? null : void e.push(t.nodeValue));
						} }), e.join("");
					}
					return this.nodeValue;
				},
				set: function(e) {
					switch (this.nodeType) {
						case I:
						case F:
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
				return new j(this, $e);
			} }), Object.defineProperty(te.prototype, "children", { get: function() {
				return new j(this, $e);
			} }), Object.defineProperty(Se.prototype, "children", { get: function() {
				return new j(this, $e);
			} }), De = function(e, t, r) {
				e["$$" + t] = r;
			});
		} catch (Pe) {}
		e._updateLiveList = q, e.Attr = me, e.CDATASection = ve, e.CharacterData = ge, e.Comment = be, e.Document = te, e.DocumentFragment = Se, e.DocumentType = ye, e.DOMImplementation = Y, e.Element = he, e.Entity = Ee, e.EntityReference = Ne, e.LiveNodeList = j, e.NamedNodeMap = W, e.Node = Q, e.NodeList = H, e.Notation = xe, e.Text = we, e.ProcessingInstruction = ke, e.walkDOM = ee, e.XMLSerializer = Te;
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
					if (t > A) {
						var r = e.substring(A, t).replace(m, d);
						T && I(A), a.characters(r, 0, t - A), A = t;
					}
				}
				var y = 0, S = 0, k = /\r\n?|\n|$/g, T = a.locator;
				function I(t, r) {
					for (; t >= S && (r = k.exec(e));) y = S, S = r.index + r[0].length, T.lineNumber++;
					T.columnNumber = t - y + 1;
				}
				var _ = [{ currentNSMap: n }], C = [], A = 0;
				for (;;) {
					try {
						var R = e.indexOf("<", A);
						if (R < 0) {
							if (!c && C.length > 0) return l.fatalError("unclosed xml tag(s): " + C.join(", "));
							if (!e.substring(A).match(/^\s*$/)) {
								var D = a.doc, $ = D.createTextNode(e.substring(A));
								if (D.documentElement) return l.error("Extra content at the end of the document");
								D.appendChild($), a.currentElement = $;
							}
							return;
						}
						if (R > A) {
							var P = e.substring(A, R);
							c || 0 !== C.length || (P = P.replace(new RegExp(r.S_OPT.source, "g"), "")) && l.error("Unexpected content outside root element: '" + P + "'"), h(R);
						}
						switch (e.charAt(R + 1)) {
							case "/":
								var M = e.indexOf(">", R + 2), O = e.substring(R + 2, M > 0 ? M : void 0);
								if (!O) return l.fatalError("end tag name missing");
								var F = r.reg("^", r.QName_group, r.S_OPT, "$"), L = M > 0 && F.exec(O);
								if (!L) {
									var B = M > 0 && r.reg("^", r.QName_group).exec(O);
									if (c && B) l.warning("end tag name contains invalid trailing characters: \"" + O + "\""), L = B;
									else {
										if (!B || !new RegExp(F.source, F.flags + "m").test(O)) return l.fatalError("end tag name contains invalid characters: \"" + O + "\"");
										l.error("end tag name is followed by a line break and trailing content: \"" + O + "\""), L = B;
									}
								}
								if (!a.currentElement && !a.doc.documentElement) return;
								var U = C[C.length - 1] || a.currentElement.tagName || a.doc.documentElement.tagName || "";
								if (U !== L[1]) {
									var z = L[1].toLowerCase();
									if (!c || U.toLowerCase() !== z) return l.fatalError("Opening and ending tag mismatch: \"" + U + "\" != \"" + O + "\"");
								}
								var H = _.pop();
								C.pop();
								var j = H.localNSMap;
								if (a.endElement(H.uri, H.localName, U), j) for (var q in j) s(j, q) && a.endPrefixMapping(q);
								M++;
								break;
							case "?":
								T && I(R), M = E(e, R, a, l);
								break;
							case "!":
								T && I(R), M = x(e, R, a, l, c);
								break;
							default:
								T && I(R);
								var W = new N(), V = _[_.length - 1].currentNSMap, G = (M = w(e, R, W, V, d, l, c), W.length);
								if (W.closed || (c && t.isHTMLVoidElement(W.tagName) ? W.closed = !0 : C.push(W.tagName)), T && G) {
									for (var X = g(T, {}), Z = 0; Z < G; Z++) {
										var Y = W[Z];
										I(Y.offset), Y.locator = g(T, {});
									}
									a.locator = X, b(W, a, V) && _.push(W), a.locator = T;
								} else b(W, a, V) && _.push(W);
								c && !W.closed ? M = v(e, M, W.tagName, d, a) : M++;
						}
					} catch (Q) {
						if (Q instanceof p) throw Q;
						if (Q instanceof f) return l.fatalError("Error constructing the DOM: " + Q.name + ": " + Q.message, Q);
						l.error("element parse error: " + Q), M = -1;
					}
					M > A ? A = M : h(Math.max(R, A) + 1);
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
		function N() {
			this.attributeNames = Object.create(null);
		}
		N.prototype = {
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
		function N(e, t, r) {
			return "string" == typeof e ? e.substr(t, r) : e.length >= t + r || t ? new java.lang.String(e, t, r) + "" : e;
		}
		function S(e, t) {
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
				S(this, i), this.currentElement = i, this.locator && E(this.locator, i);
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
				this.locator && E(this.locator, r), S(this, r);
			},
			ignorableWhitespace: function(e, t, r) {},
			characters: function(e, t, r) {
				if (e = N.apply(this, arguments)) {
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
				e = N.apply(this, arguments);
				var n = this.doc.createComment(e);
				this.locator && E(this.locator, n), S(this, n);
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
					this.locator && E(this.locator, i), S(this, i), this.doc.doctype = i;
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
	const v = "_rels/.rels";
	function y(e) {
		return e.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
	}
	function x(e) {
		return e.replaceAll("\\", "/").replace(/^\/+/, "");
	}
	function E(e, t) {
		const r = t.replaceAll("\\", "/"), n = e?.includes("/") ? e.slice(0, e.lastIndexOf("/") + 1) : "", o = r.startsWith("/") ? r.slice(1) : `${n}${r}`, i = [];
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
	function S(e) {
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
	function k(e) {
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${e.map((e) => {
			const t = "External" === e.targetMode ? " TargetMode=\"External\"" : "";
			return `<Relationship Id="${y(e.id)}" Type="${y(e.type)}" Target="${y(e.target)}"${t}/>`;
		}).join("")}</Relationships>`;
	}
	function T(e, t, r) {
		return t.map((t) => {
			if ("External" === t.targetMode) return {
				...t,
				resolvedTarget: void 0
			};
			const n = E(e, t.target);
			return n ? {
				...t,
				resolvedTarget: n
			} : (r?.(t), t);
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
		const [, r, n, o, i, a, s, l] = t, c = Number(r), u = Number(n), d = Number(o), p = [
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
	function R(e, t, r) {
		const n = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === r && n.push(e);
			}
		}
		return n;
	}
	function D(e) {
		const t = function(e) {
			if (!(e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
				const t = new b.DOMParser().parseFromString(e, "application/xml"), r = t.documentElement;
				return "http://schemas.openxmlformats.org/package/2006/metadata/core-properties" === r?.namespaceURI && "coreProperties" === r.localName ? {
					doc: t,
					root: r
				} : void 0;
			} catch {
				return;
			}
		}(e);
		if (!t) return;
		const r = {};
		for (const { key: n, ns: o, name: i } of C) {
			const e = R(t.root, o, i);
			if (1 !== e.length) continue;
			const a = e[0];
			if (Array.from({ length: a.childNodes.length }, (e, t) => a.childNodes[t]).some((e) => 1 === e?.nodeType)) continue;
			const s = A(a.textContent ?? "");
			void 0 !== s && (r[n] = s);
		}
		return Object.keys(r).length ? r : void 0;
	}
	async function $(e) {
		const t = function(e) {
			const t = e.filter((e) => "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" === e.type);
			if (1 === t.length && "External" !== t[0].targetMode) return t[0].resolvedTarget;
		}(await async function(e) {
			return T(null, S(await e.file(v)?.async("string")));
		}(e));
		if (!t) return;
		const r = await e.file(t)?.async("string");
		return r ? D(r) : void 0;
	}
	const P = "http://purl.org/dc/elements/1.1/", M = I, O = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties", F = [
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
	].includes(e.toLowerCase()), U = (e, t, r) => {
		const n = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === r && n.push(e);
			}
		}
		return n;
	}, z = (e, t, r) => {
		if (!(e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
			const n = new b.DOMParser().parseFromString(e, "application/xml"), o = n.documentElement;
			return o?.namespaceURI === t && o.localName === r ? {
				doc: n,
				root: o
			} : void 0;
		} catch {
			return;
		}
	}, H = (e) => {
		for (let r = 0; r < e.childNodes.length; r++) if (1 === e.childNodes[r]?.nodeType) return;
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
		const r = e.filter((e) => e.type === t);
		return 1 === r.length && "External" !== r[0]?.targetMode ? r[0]?.resolvedTarget : void 0;
	}
	async function W(e) {
		const t = await async function(e) {
			return T(null, S(await e.file(v)?.async("string")));
		}(e), r = q(t, "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"), n = q(t, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties"), [o, i] = await Promise.all([r ? e.file(r)?.async("string") : void 0, n ? e.file(n)?.async("string") : void 0]), a = o ? function(e) {
			const t = z(e, M, "coreProperties")?.root;
			if (!t) return;
			const r = Object.create(null);
			for (const n of F) {
				const e = U(t, n.ns, n.tag);
				if (1 !== e.length) continue;
				const o = H(e[0]);
				void 0 !== o && (r[n.key] = o);
			}
			return Object.keys(r).length ? r : void 0;
		}(o) : void 0, s = i ? function(e) {
			const t = z(e, O, "Properties")?.root;
			if (!t) return;
			const r = U(t, O, "property");
			if (r.length > 256) return;
			const n = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
			for (const a of r) {
				const e = a.getAttribute("name"), t = a.getAttribute("pid");
				if (!e || !B(e) || !t || !/^\d{1,9}$/.test(t) || Number(t) < 2 || o.has(t)) continue;
				o.add(t);
				const r = [];
				for (let n = 0; n < a.childNodes.length; n++) 1 === a.childNodes[n]?.nodeType && r.push(a.childNodes[n]);
				const i = 1 === r.length ? j(r[0]) : void 0, s = e.toLowerCase();
				n.has(s) ? n.set(s, null) : n.set(s, void 0 === i ? null : {
					name: e,
					value: i
				});
			}
			const i = Object.create(null);
			for (const a of n.values()) a && (i[a.name] = a.value);
			return Object.keys(i).length ? i : void 0;
		}(i) : void 0;
		return a || s ? {
			...a ? { core: a } : {},
			...s ? { custom: s } : {}
		} : void 0;
	}
	function V(e, t) {
		if (!e || !B(t)) return;
		const r = t.toLowerCase();
		let n, o = 0;
		for (const i of [e.core, e.custom]) for (const [e, t] of Object.entries(i ?? {})) if (e.toLowerCase() === r) {
			if (o++, "string" != typeof t || !L(t)) return;
			n = t;
		}
		return 1 === o ? n : void 0;
	}
	function G(e) {
		return `${e}:${crypto.randomUUID()}`;
	}
	function X() {
		return G("bookmark");
	}
	function Z() {
		return G("comment");
	}
	function Y(e = "") {
		return {
			id: G("run"),
			text: e,
			kind: "text"
		};
	}
	function Q(e = "") {
		return {
			id: G("paragraph"),
			type: "paragraph",
			runs: [Y(e)]
		};
	}
	function K(e) {
		return {
			id: G("paragraph"),
			type: "paragraph",
			runs: e.length > 0 ? e.map((e) => function(e = "", t, r, n) {
				const o = {
					id: G("run"),
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
			}(e.text, e.styles, e.image, e.textBox)) : [Y("")]
		};
	}
	function J(e, t = 1, r) {
		const n = {
			id: G("table-cell"),
			blocks: e.length > 0 ? e : [Q("")]
		};
		return t > 1 && (n.colSpan = t), r?.rowSpan && r.rowSpan > 1 && (n.rowSpan = r.rowSpan), r?.vMerge && (n.vMerge = r.vMerge), n;
	}
	function ee(e, t) {
		const r = {
			id: G("table-row"),
			cells: e
		};
		return t?.isHeader && (r.isHeader = !0), r;
	}
	const te = 96 / 72, re = 9525, ne = 12700, oe = 1440, ie = 1e5, ae = 6e4, se = 14.6667, le = (e) => ({
		width: .5,
		type: "solid",
		color: e
	});
	function ce(e, t, r) {
		const n = `${r ? "MediumShading1" : "LightShading"}-Accent${e}`, o = le(r ? "#ffffff" : t.accent);
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
			const r = t + 1, n = ce(r, e, !1), o = ce(r, e, !0);
			return [[n.id, n], [o.id, o]];
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
		const r = e && "object" == typeof e && "type" in e ? e.type : e;
		throw new Error(`Unhandled ${t}: ${String(r)}`);
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
	function Ee(e) {
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
	function Ne(e) {
		const t = e.pageSettings;
		return Ee({
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
	function Se() {
		return { merge(e, t) {
			if (!t) return { ...e };
			const r = { ...e };
			for (const [n, o] of Object.entries(t)) void 0 !== o && (r[n] = o);
			return r;
		} };
	}
	const ke = Se(), Te = Se();
	function Ie(e, t) {
		return ke.merge(e, t);
	}
	function _e(e, t) {
		const r = Te.merge(e, t);
		if (Array.isArray(t?.tabs)) {
			const n = [...e.tabs ?? []];
			for (const e of t.tabs) {
				const t = n.findIndex((t) => Math.abs(t.position - e.position) < 1e-6);
				t >= 0 && n.splice(t, 1), n.push(e);
			}
			r.tabs = n.sort((e, t) => e.position - t.position);
		}
		return r;
	}
	function Ce(e) {
		if (!e) return;
		const t = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.id.toLowerCase());
		if (t) return t.id;
		const r = Object.values(e).find((e) => "paragraph" === e.type && "normal" === e.name.toLowerCase());
		return r ? r.id : void 0;
	}
	function Ae(e, t) {
		if (!e || !t || !t[e]) return {};
		const r = t[e];
		return {
			...r.basedOn ? Ae(r.basedOn, t) : {},
			...r.textStyle ?? {}
		};
	}
	function Re(e, t) {
		if (!e || !t || !t[e]) return {};
		const r = t[e];
		return _e(r.basedOn ? Re(r.basedOn, t) : {}, r.paragraphStyle);
	}
	function De(e, t, r) {
		const n = Ie(Ie(Ae(t ?? Ce(r), r), Ae(e?.styleId, r)), e);
		return {
			...ge,
			...n
		};
	}
	function $e(e, t) {
		const r = e?.styleId ?? Ce(t), n = _e(Re(r, t), {
			...e,
			styleId: r
		});
		return {
			...we,
			...n
		};
	}
	function Pe(e, t) {
		if (!t) return "";
		if (!t.startsWith("asset:")) return t;
		const r = t.slice(6);
		return (e?.assets?.[r])?.url ?? t;
	}
	function Me(e) {
		return e.sections && e.sections.length > 0 ? e.sections.map((e) => ({
			...e,
			pageSettings: Ee(e.pageSettings)
		})) : [{
			id: "section:default",
			blocks: [],
			pageSettings: Ne(e)
		}];
	}
	function Oe(e) {
		return Me(e);
	}
	function Fe(e) {
		switch (e.type) {
			case "paragraph": return [e];
			case "table": return e.rows.flatMap((e) => e.cells.flatMap((e) => e.blocks.flatMap(Fe)));
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
	function Le(e) {
		const t = Object.fromEntries(Object.entries(ue).filter(([t]) => !(t in e)));
		return {
			...e,
			...t
		};
	}
	function Be(e, t, r, n, o, i) {
		const a = Ee(t ? {
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
			id: G("document"),
			pageSettings: a,
			sections: r ?? [{
				id: "section:default",
				blocks: e,
				pageSettings: a
			}],
			styles: n ? Le(n) : { ...de },
			metadata: o ?? { title: "Untitled document" },
			assets: i ?? void 0
		};
	}
	const Ue = { supportedNamespaces: /* @__PURE__ */ new Set() };
	function ze(e, ...t) {
		return { supportedNamespaces: /* @__PURE__ */ new Set([...e.supportedNamespaces, ...t]) };
	}
	function He(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function je(e) {
		const t = e.parentNode;
		return 1 === t?.nodeType ? t : null;
	}
	function qe(e, t) {
		let r = e;
		const n = t ? `xmlns:${t}` : "xmlns";
		for (; r;) {
			const e = r.getAttribute(n);
			if (e) return e;
			r = je(r);
		}
	}
	function We(e, t) {
		return e.getAttributeNS("http://schemas.openxmlformats.org/markup-compatibility/2006", t) ?? e.getAttribute(`mc:${t}`) ?? void 0;
	}
	function Ve(e, t) {
		const r = [];
		let n = e;
		for (; n;) r.push(n), n = je(n);
		const o = [];
		for (const i of r.reverse()) {
			const e = We(i, t);
			if (e) for (const t of e.split(/\s+/).filter(Boolean)) o.push({
				element: i,
				token: t
			});
		}
		return o;
	}
	function Ge(e, t) {
		const r = t.indexOf(":");
		if (r < 1 || r === t.length - 1) return;
		const n = t.slice(0, r), o = t.slice(r + 1), i = qe(e, n);
		return i ? `${i}\0${o}` : void 0;
	}
	function Xe(e, t) {
		const r = e.getAttribute("Requires")?.trim();
		return !!r && r.split(/\s+/).every((r) => {
			const n = qe(e, r);
			return Boolean(n && t.supportedNamespaces.has(n));
		});
	}
	function Ze(e, t) {
		let r;
		for (const n of He(e)) if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === n.namespaceURI) {
			if ("Choice" === n.localName && Xe(n, t)) return n;
			"Fallback" === n.localName && (r = n);
		}
		return r;
	}
	function Ye(e, t = Ue) {
		const r = [], n = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const r of Ve(e, "Ignorable")) {
				const e = qe(r.element, r.token);
				e && t.add(e);
			}
			return t;
		}(e), o = function(e) {
			const t = /* @__PURE__ */ new Set();
			for (const r of Ve(e, "ProcessContent")) {
				const e = Ge(r.element, r.token);
				e && t.add(e);
			}
			return t;
		}(e);
		for (const i of He(e)) {
			if ("http://schemas.openxmlformats.org/markup-compatibility/2006" === i.namespaceURI && "AlternateContent" === i.localName) {
				const e = Ze(i, t);
				e && r.push(...Ye(e, t));
				continue;
			}
			const e = i.namespaceURI ?? "";
			if (n.has(e) && !t.supportedNamespaces.has(e)) {
				const n = `${e}\0${i.localName ?? i.tagName}`;
				o.has(n) && r.push(...Ye(i, t));
				continue;
			}
			r.push(i);
		}
		return r;
	}
	const Qe = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Ke = "http://schemas.openxmlformats.org/drawingml/2006/main", Je = "http://schemas.microsoft.com/office/word/2010/wordml", et = ze(Ue, Je), tt = ze(Ue, "http://schemas.microsoft.com/office/word/2012/wordml");
	function rt(e, t, r) {
		return e ? Ye(e).filter((e) => e.namespaceURI === t && e.localName === r) : [];
	}
	const nt = [
		"lrTb",
		"tbRl",
		"btLr",
		"lrTbV",
		"tbRlV"
	];
	function ot(e) {
		return nt.includes(e) ? e : void 0;
	}
	function it(e, t, r) {
		return rt(e, t, r)[0] ?? null;
	}
	function at(e, t) {
		return e ? Ye(e, et).find((e) => "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function st(e, t) {
		return e ? Ye(e, tt).find((e) => "http://schemas.microsoft.com/office/word/2012/wordml" === e.namespaceURI && e.localName === t) ?? null : null;
	}
	function lt(e, t) {
		return e ? e.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2010/wordml", t) ?? e.getAttributeNS("http://schemas.microsoft.com/office/word/2012/wordml", t) ?? e.getAttribute(`w:${t}`) ?? e.getAttribute(`w14:${t}`) ?? e.getAttribute(`w15:${t}`) ?? e.getAttribute(t) : null;
	}
	function ct(e, t) {
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			if (1 === n?.nodeType) {
				const e = n;
				if (e.localName === t) return e;
				const r = ct(e, t);
				if (r) return r;
			}
		}
		return null;
	}
	function ut(e) {
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
	function dt(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function pt(e, t) {
		const r = it(e, Qe, t);
		if (!r) return;
		const n = lt(r, "val");
		return null == n || "0" !== n && "false" !== n && "off" !== n && dt(n);
	}
	function ft(e, t) {
		return lt(it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", t), "val") ?? void 0;
	}
	async function ht(e, t) {
		t > 0 && t % e === 0 && await new Promise((e) => setTimeout(e, 0));
	}
	const mt = {
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
	}, gt = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/gif": "gif",
		"image/bmp": "bmp",
		"image/tiff": "tif",
		"image/svg+xml": "svg",
		"image/x-emf": "emf",
		"image/x-wmf": "wmf"
	};
	function wt(e) {
		return gt[e.toLowerCase()] ?? null;
	}
	async function bt(e, t, r) {
		let n = r;
		n.startsWith("/") && (n = n.slice(1)), n.startsWith("word/") || (n = "word/" + r);
		const o = e.file(n), i = function(e) {
			const t = e.split(".").pop()?.toLowerCase();
			return t ? mt[t] ?? null : null;
		}(r) ?? "image/png", a = await o?.async("base64");
		if (a) return function(e, t, r) {
			const n = e.byPath.get(t);
			if (n) return `${me}${n}`;
			const o = `img-${e.nextId}`;
			return e.nextId += 1, e.assets[o] = {
				id: o,
				url: r
			}, e.byPath.set(t, o), `${me}${o}`;
		}(t, n, `data:${i};base64,${a}`);
	}
	function vt(e) {
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
	async function yt(e, t) {
		const r = t.lastIndexOf("/"), n = r >= 0 ? t.slice(0, r) : "", o = r >= 0 ? t.slice(r + 1) : t, i = n ? `${n}/_rels/${o}.rels` : `_rels/${o}.rels`;
		return vt(await e.file(i)?.async("string"));
	}
	const xt = (e) => it(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "latin")?.getAttribute("typeface")?.trim() || void 0, Et = (e) => it(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "cs")?.getAttribute("typeface")?.trim() || xt(e), Nt = (e) => it(e, "http://schemas.openxmlformats.org/drawingml/2006/main", "ea")?.getAttribute("typeface")?.trim() || xt(e);
	function St(e, t) {
		const r = 10 ** t;
		return Math.round(e * r) / r;
	}
	function kt(e, t) {
		const r = e ? Number(e) : NaN;
		return Number.isFinite(r) ? Math.round(r / oe * 96) : t;
	}
	function Tt(e) {
		const t = e ? Number(e) : NaN;
		if (Number.isFinite(t)) return St(t / 20, 4);
	}
	function It(e) {
		const t = e?.trim();
		if (t && "auto" !== t && "none" !== t) return t.startsWith("#") ? t : `#${t.toUpperCase()}`;
	}
	const _t = [
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
	function Ct(e) {
		const t = it(e, Ke, "srgbClr");
		if (t) return It(lt(t, "val"));
		const r = it(e, Ke, "sysClr");
		return r ? It(lt(r, "lastClr")) : void 0;
	}
	function At(e) {
		if (!e) return;
		const t = Number.parseInt(e, 16);
		return Number.isFinite(t) ? t / 255 : void 0;
	}
	function Rt(e, t, r) {
		const n = (e) => function(e) {
			return Math.min(255, Math.max(0, Math.round(e)));
		}(e).toString(16).padStart(2, "0").toUpperCase();
		return `#${n(e)}${n(t)}${n(r)}`;
	}
	function Dt(e, t) {
		const r = lt(e, "themeColor");
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
		const l = At(lt(e, "themeShade"));
		void 0 !== l && (i *= l, a *= l, s *= l);
		const c = At(lt(e, "themeTint"));
		if (void 0 !== c) {
			const e = 255 * (1 - c);
			i = i * c + e, a = a * c + e, s = s * c + e;
		}
		return Rt(i, a, s);
	}
	function $t(e) {
		if (!e) return {
			fonts: {},
			colors: {}
		};
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement, r = t ? rt(t, "http://schemas.openxmlformats.org/drawingml/2006/main", "themeElements")[0] ?? null : null, n = function(e) {
			const t = it(e, Ke, "fontScheme"), r = it(t, Ke, "majorFont"), n = it(t, Ke, "minorFont");
			return {
				majorHAnsi: xt(r),
				minorHAnsi: xt(n),
				majorEastAsia: Nt(r),
				minorEastAsia: Nt(n),
				majorBidi: Et(r),
				minorBidi: Et(n)
			};
		}(r), o = function(e) {
			const t = it(e, Ke, "clrScheme");
			if (!t) return {};
			const r = {};
			for (const n of _t) {
				const e = Ct(it(t, Ke, n));
				e && (r[n] = e);
			}
			return r;
		}(r), i = r ? rt(r, Ke, "fmtScheme")[0] : void 0;
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
	const Pt = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, Mt = {
		continuous: "continuous",
		eachSect: "eachSection"
	};
	function Ot(e) {
		if (!e) return;
		const t = {}, r = lt(it(e, Qe, "numFmt"), "val");
		r && Pt[r] && (t.numberFormat = Pt[r]);
		const n = Number.parseInt(lt(it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "numStart"), "val") ?? "", 10);
		Number.isFinite(n) && n > 0 && (t.startAt = n);
		const o = lt(it(e, Qe, "numRestart"), "val");
		return o && Mt[o] && (t.restart = Mt[o]), Object.keys(t).length > 0 ? t : void 0;
	}
	const Ft = {
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
	}, Lt = /^[0-9a-fA-F]{6}$/;
	function Bt(e) {
		return e.trim().replace(/^#/, "");
	}
	function Ut(e) {
		if (!e) return null;
		const t = Bt(e);
		return Lt.test(t) ? t.toUpperCase() : null;
	}
	function zt(e) {
		const t = Ut(e);
		if (t) return t;
		const r = e?.trim();
		if (!r) return null;
		const n = r.toLowerCase();
		if (Object.hasOwn(Ft, n)) return Ft[n];
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
	const Ht = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", jt = "http://schemas.openxmlformats.org/package/2006/relationships", qt = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", Wt = "http://schemas.microsoft.com/office/word/2010/wordml";
	function Vt(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
	}
	function Gt(e, t) {
		return Number.isFinite(e) ? Math.max(0, Math.round(e / 96 * oe)) : t;
	}
	function Xt(e) {
		return null != e && Number.isFinite(e) ? Math.round(e / 96 * oe) : null;
	}
	function Zt(e) {
		return null != e && Number.isFinite(e) ? Math.max(0, Math.round(20 * e)) : null;
	}
	function Yt(e, t = "000000") {
		return zt(e) ?? t;
	}
	function Qt(e) {
		return `<w:shd w:val="clear" w:color="auto" w:fill="${Yt(e, "FFFFFF")}"/>`;
	}
	function Kt(e) {
		return e.length > 0 && e.length <= 128 && /^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e);
	}
	function Jt(e) {
		return e.length <= 4096 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(e);
	}
	function er(e, t, r) {
		const n = [];
		for (let o = 0; o < e.childNodes.length; o++) {
			const i = e.childNodes[o];
			if (1 === i?.nodeType) {
				const e = i;
				e.namespaceURI === t && e.localName === r && n.push(e);
			}
		}
		return n;
	}
	function tr(e, t) {
		if (!e || !Kt(t)) return;
		const r = t.toLowerCase();
		let n;
		for (const [o, i] of Object.entries(e)) if (o.toLowerCase() === r) {
			if (void 0 !== n || "string" != typeof i || !Jt(i)) return;
			n = i;
		}
		return n;
	}
	function rr(e) {
		return e.ooxmlNumbering;
	}
	function nr(e) {
		const t = rr(e);
		if (t?.format && t.importedKind === e.kind && t.importedFormat === e.format) return t.format;
	}
	function or(e) {
		if (!e) return;
		const t = lt(e, "id"), r = lt(e, "author"), n = lt(e, "date");
		if (!t || !r || !n) return;
		const o = Date.parse(n);
		return Number.isFinite(o) ? {
			id: t,
			author: r,
			date: o
		} : void 0;
	}
	const ir = {
		decimal: "decimal",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		bullet: "bullet"
	};
	function ar(e) {
		const t = lt(e, "val");
		if (null == t) return;
		const r = Number.parseInt(t, 10);
		return Number.isFinite(r) ? r : void 0;
	}
	function sr(e, t) {
		if (!e || !/^\d+$/.test(e)) return;
		const r = Number.parseInt(e, 10);
		return Number.isSafeInteger(r) && r >= t ? r : void 0;
	}
	function lr(e) {
		const t = {}, r = lt(it(e, Qe, "numFmt"), "val");
		r && (t.kind = "bullet" === r ? "bullet" : "ordered", t.format = ir[r], t.rawFormat = r);
		const n = lt(it(e, Qe, "suff"), "val");
		"tab" !== n && "space" !== n && "nothing" !== n || (t.suffix = n);
		const o = ar(it(e, Qe, "start"));
		void 0 !== o && (t.startAt = o), t.levelText = lt(it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "lvlText"), "val") ?? void 0;
		const i = lt(it(e, Qe, "lvlJc"), "val");
		"left" !== i && "center" !== i && "right" !== i || (t.alignment = i);
		const a = it(e, Qe, "isLgl");
		a && (t.legal = function(e) {
			return null == e || "1" === e || "true" === e || "on" === e;
		}(lt(a, "val")));
		const s = ar(it(e, Qe, "lvlRestart"));
		void 0 !== s && (t.restartAfterLevel = s), t.paragraphStyleId = lt(it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "pStyle"), "val") ?? void 0, "bullet" === t.kind && t.levelText && (t.bulletGlyph = t.levelText);
		const c = it(it(e, Qe, "rPr"), Qe, "rFonts");
		t.bulletFont = lt(c, "ascii") ?? lt(c, "hAnsi") ?? void 0;
		const d = it(it(e, Qe, "pPr"), Qe, "ind");
		if (d) {
			const e = lt(d, "left") ?? lt(d, "start"), r = lt(d, "hanging"), n = null != e ? kt(e, 0) : void 0, o = null != r ? kt(r, 0) : void 0;
			void 0 === n && void 0 === o || (t.indent = {
				left: n,
				hanging: o
			});
		}
		return t;
	}
	function cr(e, t, r) {
		const n = e.numToAbstractId.get(t), o = n ? e.abstractLevels.get(`${n}:${r}`) : void 0;
		return e.numOverrideLevels.get(`${t}:${r}`) ?? o ?? {};
	}
	const ur = {
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
	}, dr = (e) => e.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[\s_-]+/g, "");
	function pr(e) {
		if (!0 === e.customStyle || "table" === e.type) return;
		const t = dr(e.id), r = dr(e.name);
		for (const n of Object.keys(ur)) {
			const o = ur[n];
			if (o.type !== e.type) continue;
			const i = o.names.map(dr);
			if ((t === dr(n) || i.includes(t)) && i.includes(r)) return n;
		}
	}
	function fr(e) {
		if (!e) return;
		const t = lt(e, "val");
		if ("nil" === t || "none" === t) return {
			width: 0,
			type: "none",
			color: "transparent"
		};
		const r = Number(lt(e, "sz")), n = Number.isFinite(r) && r > 0 ? St(r / 8, 4) : .75, o = It(lt(e, "color")) ?? "#000000", i = t?.toLowerCase() ?? "single";
		return {
			width: n,
			type: i.includes("dotted") || i.includes("dot") ? "dotted" : i.includes("dash") ? "dashed" : "solid",
			color: o
		};
	}
	function hr(e) {
		return e ? {
			borderTop: fr(it(e, Qe, "top")),
			borderRight: fr(it(e, Qe, "right")),
			borderBottom: fr(it(e, Qe, "bottom")),
			borderLeft: fr(it(e, Qe, "left")),
			borderStart: fr(it(e, Qe, "start")),
			borderEnd: fr(it(e, Qe, "end")),
			borderTopLeftToBottomRight: fr(it(e, Qe, "tl2br")),
			borderTopRightToBottomLeft: fr(it(e, Qe, "tr2bl")),
			borderBetween: fr(it(e, Qe, "between")),
			borderBar: fr(it(e, Qe, "bar"))
		} : {};
	}
	function mr(e) {
		const t = Object.entries(e).filter(([, e]) => void 0 !== e);
		return t.length > 0 ? Object.fromEntries(t) : void 0;
	}
	function gr(e) {
		return Object.keys(e).length > 0 ? e : void 0;
	}
	function wr(e, t) {
		return gr({
			...e ?? {},
			...t ?? {}
		});
	}
	function br(e, t) {
		return It(lt(e, "fill")) || (t ? Dt(e, t) : void 0);
	}
	function vr(e) {
		const t = it(e, Je, "solidFill");
		if (t) {
			const e = function(e) {
				const t = it(e, Je, "srgbClr");
				if (!t) return null;
				const r = lt(t, "val");
				return r ? It(r) ?? null : null;
			}(t);
			if (e) return {
				type: "solid",
				color: e
			};
		}
		const r = it(e, Je, "gradFill");
		if (r) {
			const e = it(r, Je, "gsLst");
			if (e) {
				const t = [];
				for (let r = 0; r < e.childNodes.length; r++) {
					const n = e.childNodes[r];
					if (n?.nodeType !== n.ELEMENT_NODE) continue;
					const o = n;
					if ("http://schemas.microsoft.com/office/word/2010/wordml" !== o.namespaceURI || "gs" !== o.localName) continue;
					const i = lt(o, "pos"), a = null !== i ? Number(i) / ie : NaN;
					if (!Number.isFinite(a)) continue;
					const s = it(o, Je, "srgbClr");
					if (!s) continue;
					const l = lt(s, "val");
					if (!l) continue;
					const c = It(l);
					if (!c) continue;
					const u = it(s, Je, "alpha"), d = u ? lt(u, "val") : null, p = null !== d ? Number(d) / ie : void 0, f = {
						position: a,
						color: c
					};
					void 0 !== p && Number.isFinite(p) && (f.alpha = p), t.push(f);
				}
				if (t.length > 0) {
					const e = it(r, Je, "lin"), n = e ? lt(e, "ang") : null, o = null !== n ? Number(n) / ae : void 0, i = {
						type: "gradient",
						stops: t
					};
					return void 0 !== o && Number.isFinite(o) && (i.angle = o), i;
				}
			}
		}
		return null;
	}
	function yr(e) {
		const t = it(e, Je, "srgbClr");
		if (!t) return null;
		const r = lt(t, "val"), n = r ? It(r) ?? null : null;
		if (!n) return null;
		const o = it(t, Je, "alpha"), i = o ? lt(o, "val") : null, a = null !== i && Number.isFinite(Number(i)) ? Number(i) / ie : void 0;
		return {
			color: n,
			...void 0 !== a ? { alpha: a } : {}
		};
	}
	function xr(e, t) {
		if (!e) return;
		const r = De(e, t, de), n = De(void 0, t, de), o = (e, t) => e !== t ? e : void 0, i = (e, t, r) => void 0 !== e ? e : o(t, r);
		return mr({
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
				previous: xr(e.propertyRevision.previous, t) ?? {}
			} : void 0
		});
	}
	function Er(e, t) {
		if (!e) return;
		const r = {}, n = ft(e, "rStyle");
		n && (r.styleId = n);
		const o = pt(e, "b"), i = pt(e, "bCs");
		void 0 === o && void 0 === i || (r.bold = !0 === o || !0 === i);
		const a = pt(e, "i"), s = pt(e, "iCs");
		void 0 === a && void 0 === s || (r.italic = !0 === a || !0 === s);
		const l = pt(e, "strike");
		void 0 !== l && (r.strike = l);
		const c = pt(e, "dstrike");
		void 0 !== c && (r.doubleStrike = c);
		const u = pt(e, "smallCaps");
		void 0 !== u && (r.smallCaps = u);
		const d = pt(e, "caps");
		void 0 !== d && (r.allCaps = d);
		const p = pt(e, "vanish");
		void 0 !== p && (r.hidden = p);
		const f = pt(e, "noProof");
		void 0 !== f && (r.noProof = f);
		const h = pt(e, "webHidden");
		void 0 !== h && (r.webHidden = h);
		const m = pt(e, "specVanish");
		void 0 !== m && (r.specVanish = m);
		const g = pt(e, "rtl");
		void 0 !== g && (r.rtl = g);
		const w = pt(e, "cs");
		void 0 !== w && (r.complexScript = w);
		const v = pt(e, "snapToGrid");
		void 0 !== v && (r.snapToGrid = v);
		const y = pt(e, "outline");
		void 0 !== y && (r.outline = y);
		const x = pt(e, "shadow");
		void 0 !== x && (r.shadow = x);
		const E = pt(e, "emboss");
		void 0 !== E && (r.emboss = E);
		const N = pt(e, "imprint");
		void 0 !== N && (r.imprint = N);
		const S = lt(it(e, Qe, "em"), "val");
		"dot" !== S && "comma" !== S && "circle" !== S && "underDot" !== S && "none" !== S || (r.emphasisMark = S);
		const k = lt(it(e, Qe, "fitText"), "val");
		if (k) {
			const e = Tt(k);
			void 0 !== e && e > 0 && (r.fitText = e);
		}
		const T = fr(it(e, Qe, "bdr"));
		T && (r.textBorder = T);
		const I = lt(it(e, Qe, "effect"), "val");
		I && (r.textEffect = I);
		const _ = lt(it(e, Qe, "w"), "val");
		if (_) {
			const e = Number(_);
			Number.isFinite(e) && e > 0 && (r.characterScale = e);
		}
		const C = lt(it(e, Qe, "spacing"), "val");
		if (C) {
			const e = Tt(C);
			void 0 !== e && (r.characterSpacing = e);
		}
		const A = lt(it(e, Qe, "position"), "val");
		if (A) {
			const e = Number(A);
			Number.isFinite(e) && (r.baselineShift = e / 2);
		}
		const R = lt(it(e, Qe, "kern"), "val");
		if (R) {
			const e = Number(R);
			Number.isFinite(e) && e >= 0 && (r.kerningThreshold = e / 2);
		}
		const D = lt(it(e, Je, "ligatures"), "val");
		"none" !== D && "standard" !== D && "contextual" !== D && "historical" !== D && "standardContextual" !== D || (r.ligatures = D);
		const $ = lt(it(e, Je, "numSpacing"), "val");
		"proportional" !== $ && "tabular" !== $ || (r.numberSpacing = $);
		const P = lt(it(e, Je, "numForm"), "val");
		"lining" !== P && "oldStyle" !== P || (r.numberForm = P);
		const M = lt(it(e, Je, "stylisticSets"), "val");
		if (M) {
			const e = /^[0-9a-fA-F]+$/.test(M) && M.length > 2 ? Number.parseInt(M, 16) : Number(M);
			if (Number.isFinite(e) && e > 0) {
				for (let t = 1; t <= 20; t += 1) if (e & 1 << t - 1) {
					r.stylisticSet = t;
					break;
				}
			}
		}
		const O = lt(it(e, Je, "cntxtAlts"), "val");
		null === O ? it(e, "http://schemas.microsoft.com/office/word/2010/wordml", "cntxtAlts") && (r.contextualAlternates = !0) : r.contextualAlternates = dt(O);
		const F = it(e, Qe, "u"), L = lt(F, "val");
		if (F) {
			r.underline = "none" !== L, r.underlineStyle = "none" === L ? null : L || "single";
			const e = lt(F, "color");
			e && "auto" !== e && (r.underlineColor = It(e));
		}
		const B = lt(it(e, Qe, "vertAlign"), "val");
		"superscript" !== B && "subscript" !== B && "baseline" !== B || (r.superscript = "superscript" === B, r.subscript = "subscript" === B);
		const U = it(e, Qe, "rFonts"), z = lt(U, "ascii") ?? lt(U, "hAnsi") ?? lt(U, "cs") ?? lt(U, "eastAsia") ?? function(e, t) {
			const r = lt(e, "asciiTheme") ?? lt(e, "hAnsiTheme") ?? lt(e, "eastAsiaTheme") ?? lt(e, "cstheme");
			if (!r) return;
			const n = "majorAscii" === r || "majorHAnsi" === r ? "majorHAnsi" : "minorAscii" === r || "minorHAnsi" === r ? "minorHAnsi" : "majorEastAsia" === r ? "majorEastAsia" : "minorEastAsia" === r ? "minorEastAsia" : "majorBidi" === r ? "majorBidi" : "minorBidi" === r ? "minorBidi" : void 0;
			return n ? t[n] : void 0;
		}(U, t.fonts);
		z && (r.fontFamily = function(e) {
			const t = e?.trim();
			if (t) return `${/[\s,]/.test(t) ? `"${t.replace(/"/g, "\\\"")}"` : t}, ${/times/i.test(t) ? "serif" : "sans-serif"}`;
		}(z));
		const H = lt(it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "sz") ?? it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "szCs"), "val");
		if (H) {
			const e = function(e) {
				const t = e ? Number(e) : NaN;
				return Number.isFinite(t) ? St(t / 2 / 72 * 96, 4) : null;
			}(H);
			null !== e && (r.fontSize = e);
		}
		const j = it(e, Qe, "color"), q = lt(j, "val");
		if (q && "auto" !== q) r.color = It(q);
		else if ("auto" !== q) {
			const e = Dt(j, t.colors);
			e && (r.color = e);
		}
		const W = at(e, "textFill");
		if (W) {
			const e = vr(W);
			e && (r.textFill = e);
		}
		const V = at(e, "textOutline");
		if (V) {
			const e = V.getAttributeNS(Je, "w"), t = null !== e ? Number(e) : NaN, n = { widthPt: Number.isFinite(t) && t > 0 ? t / ne : .5 }, o = vr(V);
			o && (n.fill = o, "solid" === o.type ? n.color = o.color : "gradient" === o.type && o.stops[0] && (n.color = o.stops[0].color)), r.textOutline = n;
		}
		const G = at(e, "shadow");
		if (G) {
			const e = function(e) {
				const t = yr(e);
				if (!t) return null;
				const r = e.getAttributeNS(Je, "blurRad"), n = e.getAttributeNS(Je, "dist"), o = e.getAttributeNS(Je, "dir"), i = r ? Number(r) / ne : 0, a = n ? Number(n) / ne : 0, s = o ? Number(o) / ae : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					blurPt: i,
					distPt: a,
					dirDeg: s
				};
			}(G);
			e && (r.textShadow = e);
		}
		const X = at(e, "glow");
		if (X) {
			const e = function(e) {
				const t = yr(e);
				if (!t) return null;
				const r = e.getAttributeNS(Je, "rad"), n = r ? Number(r) / ne : 0;
				return {
					color: t.color,
					...void 0 !== t.alpha ? { alpha: t.alpha } : {},
					radiusPt: n
				};
			}(X);
			e && (r.glow = e);
		}
		const Z = at(e, "reflection");
		Z && (r.reflection = function(e) {
			const t = e.getAttributeNS(Je, "blurRad"), r = e.getAttributeNS(Je, "stA"), n = e.getAttributeNS(Je, "stPos"), o = e.getAttributeNS(Je, "endA"), i = e.getAttributeNS(Je, "endPos"), a = e.getAttributeNS(Je, "dist");
			return {
				blurPt: t ? Number(t) / ne : 0,
				startAlpha: null !== r ? Number(r) / ie : .55,
				startPos: null !== n ? Number(n) / ie : 0,
				endAlpha: null !== o ? Number(o) / ie : 0,
				endPos: null !== i ? Number(i) / ie : 1,
				distPt: a ? Number(a) / ne : 0
			};
		}(Z));
		const Y = at(e, "scene3d");
		Y && (r.scene3dXml = new b.XMLSerializer().serializeToString(Y));
		const Q = at(e, "props3d");
		Q && (r.props3dXml = new b.XMLSerializer().serializeToString(Q));
		const K = lt(it(e, Qe, "highlight"), "val");
		K && "none" !== K && (r.highlight = K);
		const J = br(it(e, Qe, "shd"), t.colors);
		J && (r.shading = J);
		const ee = it(e, Qe, "lang");
		if (ee) {
			const e = lt(ee, "val"), t = lt(ee, "eastAsia"), n = lt(ee, "bidi"), o = {};
			e && (o.value = e), t && (o.eastAsia = t), n && (o.bidi = n), Object.keys(o).length > 0 && (r.language = o);
		}
		const te = it(e, Qe, "rPrChange"), re = or(te), oe = it(te, Qe, "rPr");
		return re && oe && (r.propertyRevision = {
			...re,
			type: "property",
			previous: Er(oe, t) ?? {}
		}), gr(r);
	}
	const Nr = [
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
	], Sr = [
		["top", "borderTop"],
		["left", "borderLeft"],
		["bottom", "borderBottom"],
		["right", "borderRight"],
		["insideH", "borderInsideH"],
		["insideV", "borderInsideV"]
	];
	function kr(e) {
		if (!e) return;
		const t = lt(e, "type"), r = lt(e, "w");
		if ("auto" === t) return "auto";
		if ("pct" === t) {
			if (!r) return;
			const e = r.trim().endsWith("%") ? Number.parseFloat(r) : Number(r) / 50;
			return Number.isFinite(e) ? `${St(e, 4)}%` : void 0;
		}
		return Tt(r);
	}
	function Tr(e, t) {
		const r = lt(it(e, Qe, t), "val"), n = r ? Number(r) : NaN;
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : void 0;
	}
	function Ir(e) {
		const t = it(e, Qe, "cnfStyle");
		if (!t) return;
		const r = lt(t, "val") ?? "", n = {};
		return Nr.forEach(([e, o], i) => {
			const a = lt(t, e);
			"1" === a || "true" === a || "on" === a ? n[o] = !0 : "0" === a || "false" === a || "off" === a ? n[o] = !1 : 12 === r.length && "1" === r[i] && (n[o] = !0);
		}), Object.keys(n).length > 0 ? n : void 0;
	}
	function _r(e) {
		const t = lt(e, "date"), r = t ? Date.parse(t) : NaN;
		return {
			id: lt(e, "id") ?? `revision:${e.localName}`,
			author: lt(e, "author") ?? "Unknown",
			date: Number.isFinite(r) ? r : 0
		};
	}
	function Cr(e) {
		if (!e) return;
		const t = it(e, Qe, "tblPrEx");
		return t ? {
			..._r(e),
			type: "property",
			previous: Rr(t) ?? {}
		} : void 0;
	}
	function Ar(e) {
		if (!e) return;
		const t = (t) => Tt(lt(it(e, Qe, t), "w")), r = {}, n = t("top"), o = t("right"), i = t("bottom"), a = t("left"), s = t("start"), l = t("end");
		return void 0 !== n && (r.top = n), void 0 !== o && (r.right = o), void 0 !== i && (r.bottom = i), void 0 !== a && (r.left = a), void 0 !== s && (r.start = s), void 0 !== l && (r.end = l), Object.keys(r).length > 0 ? r : void 0;
	}
	function Rr(e, t) {
		const r = {};
		t && (r.styleId = t);
		const n = lt(it(e, Qe, "tblCaption"), "val");
		n && (r.altTitle = n);
		const o = lt(it(e, Qe, "tblDescription"), "val");
		o && (r.altDescription = o);
		const i = kr(it(e, Qe, "tblW"));
		void 0 !== i && (r.width = i);
		const a = kr(it(e, Qe, "tblInd"));
		void 0 !== a && (r.indentLeft = a);
		const s = lt(it(e, Qe, "jc"), "val");
		"left" === s || "start" === s ? r.align = "left" : "center" === s ? r.align = "center" : "right" !== s && "end" !== s || (r.align = "right");
		const l = function(e) {
			const t = lt(it(e, Qe, "tblLayout"), "type");
			return "fixed" === t || "autofit" === t ? t : void 0;
		}(e);
		l && (r.layout = l);
		const c = kr(it(e, Qe, "tblCellSpacing"));
		void 0 !== c && (r.cellSpacing = c);
		const u = (d = it(e, Qe, "tblBorders")) ? {
			...hr(d),
			borderInsideH: fr(it(d, Qe, "insideH")),
			borderInsideV: fr(it(d, Qe, "insideV"))
		} : {};
		var d;
		Object.keys(u).length > 0 && (r.borders = u);
		const p = Ar(it(e, Qe, "tblCellMar"));
		p && (r.defaultCellMargins = p);
		const f = e ? pt(e, "bidiVisual") : void 0;
		void 0 !== f && (r.bidiVisual = f);
		const h = lt(it(e, Qe, "tblOverlap"), "val");
		"overlap" !== h && "never" !== h || (r.tblOverlap = h);
		const m = function(e) {
			const t = it(e, Qe, "tblpPr");
			if (!t || !t.attributes || 0 === t.attributes.length) return;
			const r = {};
			for (let l = 0; l < t.attributes.length; l += 1) {
				const e = t.attributes.item(l);
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e?.namespaceURI && "w" !== e?.prefix || (r[e.localName || e.name.replace(/^w:/, "")] = e.value);
			}
			const n = (e) => Tt(r[e] ?? null), o = "margin" === r.horzAnchor || "page" === r.horzAnchor || "text" === r.horzAnchor ? r.horzAnchor : void 0, i = "margin" === r.vertAnchor || "page" === r.vertAnchor || "text" === r.vertAnchor ? r.vertAnchor : void 0, a = "left" === r.tblpXSpec || "center" === r.tblpXSpec || "right" === r.tblpXSpec || "inside" === r.tblpXSpec || "outside" === r.tblpXSpec ? r.tblpXSpec : void 0, s = "top" === r.tblpYSpec || "center" === r.tblpYSpec || "bottom" === r.tblpYSpec || "inside" === r.tblpYSpec || "outside" === r.tblpYSpec ? r.tblpYSpec : void 0;
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
		const g = Tr(e, "tblStyleRowBandSize");
		void 0 !== g && (r.rowBandSize = g);
		const w = Tr(e, "tblStyleColBandSize");
		void 0 !== w && (r.colBandSize = w);
		const b = it(e, Qe, "tblLook");
		if (b) {
			const e = lt(b, "val"), t = e ? Number.parseInt(e, 16) : NaN, n = (e, r, n) => {
				const o = lt(b, e);
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
		const v = it(e, Qe, "tblPrChange"), y = it(v, Qe, "tblPr");
		return v && y && (r.revision = {
			..._r(v),
			type: "property",
			previous: Rr(y) ?? {}
		}), gr(r);
	}
	function Dr(e) {
		if (!e) return;
		const t = {}, r = pt(e, "tblHeader");
		void 0 !== r && (t.isHeader = r);
		const n = Tr(e, "gridBefore");
		void 0 !== n && (t.gridBefore = n);
		const o = Tr(e, "gridAfter");
		void 0 !== o && (t.gridAfter = o);
		const i = kr(it(e, Qe, "wBefore"));
		void 0 !== i && (t.widthBefore = i);
		const a = kr(it(e, Qe, "wAfter"));
		void 0 !== a && (t.widthAfter = a);
		const s = it(e, Qe, "trHeight"), l = Tt(lt(s, "val"));
		void 0 !== l && (t.height = l);
		const c = lt(s, "hRule");
		"auto" !== c && "exact" !== c && "atLeast" !== c || (t.heightRule = c);
		const u = kr(it(e, Qe, "tblCellSpacing"));
		void 0 !== u && (t.cellSpacing = u);
		const d = lt(it(e, Qe, "jc"), "val");
		"left" === d || "start" === d ? t.align = "left" : "center" === d ? t.align = "center" : "right" !== d && "end" !== d || (t.align = "right");
		const p = pt(e, "cantSplit");
		void 0 !== p && (t.cantSplit = p);
		const f = pt(e, "hidden");
		void 0 !== f && (t.hidden = f);
		const h = it(e, Qe, "trPrChange"), m = it(h, Qe, "trPr");
		h && m && (t.propertyRevision = {
			..._r(h),
			type: "property",
			previous: Dr(m) ?? {}
		});
		const g = it(e, Qe, "ins"), w = it(e, Qe, "del"), b = g ?? w;
		return b && (t.revision = {
			..._r(b),
			type: g ? "insert" : "delete"
		}), gr(t);
	}
	function $r(e) {
		if (!e) return 1;
		const t = lt(it(e, Qe, "gridSpan"), "val"), r = t ? Number(t) : 1;
		return Number.isFinite(r) && r > 1 ? Math.floor(r) : 1;
	}
	function Pr(e) {
		if (!e) return;
		const t = it(e, Qe, "vMerge");
		return t ? "restart" === lt(t, "val") ? "restart" : "continue" : void 0;
	}
	function Mr(e) {
		if (!e) return;
		const t = it(e, Qe, "hMerge");
		return t ? "restart" === lt(t, "val") ? "restart" : "continue" : void 0;
	}
	function Or(e, t, r) {
		if (!e) {
			if (!t) return;
			return gr({
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
		}, o = br(it(e, Qe, "shd"), r);
		o && (n.shading = o);
		const i = it(e, Qe, "tcW"), a = lt(i, "type"), s = lt(i, "w");
		if ("dxa" === a) {
			const e = Tt(s);
			void 0 !== e && (n.width = e);
		} else if ("pct" === a && s) {
			const e = Number(s);
			Number.isFinite(e) && (n.width = `${St(e / 50, 4)}%`);
		}
		const l = Ar(it(e, Qe, "tcMar"));
		l && (void 0 !== l.top && (n.paddingTop = l.top), void 0 !== l.bottom && (n.paddingBottom = l.bottom), void 0 !== l.left && (n.paddingLeft = l.left), void 0 !== l.right && (n.paddingRight = l.right), void 0 !== l.start && (n.paddingStart = l.start), void 0 !== l.end && (n.paddingEnd = l.end));
		const c = function(e) {
			if (!e) return;
			const t = lt(it(e, Qe, "vAlign"), "val");
			return "top" === t || "bottom" === t ? t : "center" === t ? "middle" : void 0;
		}(e);
		c && (n.verticalAlign = c);
		const u = ot(lt(it(e, Qe, "textDirection"), "val"));
		u && (n.textDirection = u);
		const d = pt(e, "noWrap");
		void 0 !== d && (n.noWrap = d);
		const p = pt(e, "tcFitText");
		void 0 !== p && (n.fitText = p);
		const f = pt(e, "hideMark");
		void 0 !== f && (n.hideMark = f);
		const h = lt(it(e, Qe, "headers"), "val");
		h && (n.headers = h);
		const m = it(e, Qe, "tcPrChange"), g = it(m, Qe, "tcPr");
		m && g && (n.propertyRevision = {
			..._r(m),
			type: "property",
			previous: Or(g, void 0, r) ?? {}
		});
		const w = it(e, Qe, "cellIns"), b = it(e, Qe, "cellDel"), v = it(e, Qe, "cellMerge"), y = w ?? b ?? v;
		if (y) {
			const e = function(e) {
				return "rest" === e || "restart" === e ? "restart" : "cont" === e || "continue" === e ? "continue" : void 0;
			}(lt(y, "vMergeOrig"));
			n.revision = {
				..._r(y),
				type: w ? "insert" : b ? "delete" : "merge",
				...v && e ? { previous: { vMerge: e } } : {}
			};
		}
		for (const [x, E] of Object.entries(function(e) {
			return e ? hr(it(e, Qe, "tcBorders")) : {};
		}(e))) E && (n[x] = E);
		return gr(n);
	}
	function Fr(e) {
		const t = it(e, Qe, "trPr");
		return !!t && !0 === pt(t, "tblHeader");
	}
	function Lr(e) {
		if (!e) return;
		const t = $e(e, de), r = $e(void 0, de);
		return mr({
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
				previous: Lr(e.propertyRevision.previous) ?? {}
			} : void 0
		});
	}
	function Br(e) {
		return void 0 !== e?.lineHeight ? e : {
			...e ?? {},
			lineHeight: 1.1
		};
	}
	function Ur(e, t) {
		if (!e) return;
		const r = {}, n = ft(e, "pStyle");
		n && (r.styleId = n);
		const o = lt(it(e, Qe, "jc"), "val");
		"left" === o || "start" === o || "center" === o || "right" === o || "end" === o || "justify" === o ? r.align = "start" === o ? "left" : "end" === o ? "right" : o : "both" !== o && "distribute" !== o || (r.align = "justify");
		const i = it(e, Qe, "spacing"), a = lt(i, "before"), s = lt(i, "after"), l = lt(i, "line"), c = lt(i, "lineRule");
		a && (r.spacingBefore = kt(a, 0)), s && (r.spacingAfter = kt(s, 0)), l && ("exact" === c || "atLeast" === c ? (r.lineHeight = St(Number(l) / 1440 * 96, 4), r.lineRule = c) : r.lineHeight = Number(l) / 240);
		const u = pt(e, "contextualSpacing");
		void 0 !== u && (r.contextualSpacing = u);
		const d = pt(e, "snapToGrid");
		void 0 !== d && (r.snapToGrid = d);
		const p = it(e, Qe, "ind"), f = lt(p, "start") ?? lt(p, "left"), h = lt(p, "end") ?? lt(p, "right"), m = lt(p, "firstLine"), g = lt(p, "hanging");
		f && (r.indentLeft = kt(f, 0)), h && (r.indentRight = kt(h, 0)), g ? (r.indentHanging = kt(g, 0), r.indentFirstLine = void 0) : m && (r.indentFirstLine = kt(m, 0));
		const w = function(e) {
			const t = it(e, Qe, "tabs");
			if (!t) return [];
			const r = [];
			for (const n of rt(t, Qe, "tab")) {
				const e = Tt(lt(n, "pos"));
				if (void 0 === e) continue;
				const t = lt(n, "val"), o = "center" === t || "right" === t || "decimal" === t || "bar" === t || "clear" === t ? t : "left", i = lt(n, "leader"), a = "dot" === i || "hyphen" === i || "underscore" === i || "heavy" === i || "middleDot" === i ? i : "none" === i ? "none" : void 0;
				r.push({
					position: e,
					type: o,
					...void 0 !== a ? { leader: a } : {}
				});
			}
			return r;
		}(e);
		w.length > 0 && (r.tabs = w);
		const v = pt(e, "pageBreakBefore");
		void 0 !== v && (r.pageBreakBefore = v);
		const y = pt(e, "keepNext");
		void 0 !== y && (r.keepWithNext = y);
		const x = pt(e, "keepLines");
		void 0 !== x && (r.keepLinesTogether = x);
		const E = pt(e, "widowControl");
		void 0 !== E && (r.widowControl = E);
		const N = pt(e, "mirrorIndents");
		void 0 !== N && (r.mirrorIndents = N);
		const S = it(e, Qe, "pBdr");
		if (S) {
			const { borderTop: e, borderRight: t, borderBottom: n, borderLeft: o, borderBetween: i, borderBar: a } = hr(S);
			e && (r.borderTop = e), t && (r.borderRight = t), n && (r.borderBottom = n), o && (r.borderLeft = o), i && (r.borderBetween = i), a && (r.borderBar = a);
		}
		const k = br(it(e, Qe, "shd"), t);
		k && (r.shading = k);
		const T = ot(lt(it(e, Qe, "textDirection"), "val"));
		T && (r.textDirection = T);
		const I = lt(it(e, Qe, "outlineLvl"), "val");
		if (void 0 !== I) {
			const e = Number(I);
			Number.isFinite(e) && e >= 0 && e <= 8 && (r.outlineLevel = e);
		}
		const _ = pt(e, "suppressLineNumbers");
		void 0 !== _ && (r.suppressLineNumbers = _);
		const C = pt(e, "suppressAutoHyphens");
		void 0 !== C && (r.suppressAutoHyphens = C);
		const A = pt(e, "bidi");
		void 0 !== A && (r.bidi = A);
		const R = pt(e, "kinsoku");
		void 0 !== R && (r.kinsoku = R);
		const D = pt(e, "wordWrap");
		void 0 !== D && (r.wordWrap = D);
		const $ = pt(e, "overflowPunct");
		void 0 !== $ && (r.overflowPunct = $);
		const P = pt(e, "topLinePunct");
		void 0 !== P && (r.topLinePunct = P);
		const M = pt(e, "autoSpaceDE");
		void 0 !== M && (r.autoSpaceDE = M);
		const O = pt(e, "autoSpaceDN");
		void 0 !== O && (r.autoSpaceDN = O);
		const F = pt(e, "adjustRightInd");
		void 0 !== F && (r.adjustRightInd = F);
		const L = lt(it(e, Qe, "textAlignment"), "val");
		"auto" !== L && "top" !== L && "center" !== L && "baseline" !== L && "bottom" !== L || (r.textAlignment = L);
		const B = lt(it(e, Qe, "textboxTightWrap"), "val");
		"none" !== B && "allLines" !== B && "firstLineOnly" !== B && "firstLastLine" !== B || (r.textboxTightWrap = B);
		const U = lt(it(e, Qe, "divId"), "val");
		if (null !== U) {
			const e = Number(U);
			Number.isFinite(e) && e >= 0 && (r.divId = Math.floor(e));
		}
		const z = Ir(e);
		z && (r.conditionalStyle = z);
		const H = it(e, Qe, "framePr");
		if (H) {
			const e = lt(H, "dropCap");
			e && "none" !== e || (r.framePrXml = new b.XMLSerializer().serializeToString(H));
		}
		const j = it(e, Qe, "pPrChange"), q = or(j), W = it(j, Qe, "pPr");
		return q && W && (r.propertyRevision = {
			...q,
			type: "property",
			previous: Ur(W, t) ?? {}
		}), gr(r);
	}
	const zr = {
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
	function Hr(e) {
		return "1" === e || "true" === e || "on" === e;
	}
	function jr(e) {
		const t = it(e, Qe, "cols");
		if (!t) return;
		const r = Number.parseInt(lt(t, "num") ?? "1", 10);
		if (!Number.isFinite(r) || r <= 1) return;
		const n = kt(lt(t, "space"), 0), o = lt(t, "sep"), i = lt(t, "equalWidth"), a = rt(t, Qe, "col").map((e) => ({
			width: kt(lt(e, "w"), 0),
			space: kt(lt(e, "space"), n)
		})), s = null == i || Hr(i);
		return {
			count: r,
			space: n,
			...Hr(o) ? { separator: !0 } : {},
			...s ? {} : { equalWidth: !1 },
			...!s && a.length > 0 ? { columns: a } : {}
		};
	}
	function qr(e) {
		const t = it(e, Qe, "pgSz"), r = it(e, Qe, "pgMar"), n = jr(e), i = it(it(e, Qe, "pgBorders"), Qe, "top"), a = lt(i, "val"), s = lt(i, "color"), l = Number.parseInt(lt(i, "sz") ?? "0", 10), c = a && s && "nil" !== a ? {
			style: "double" === a || "dashed" === a || "dotted" === a ? a : "single",
			color: `#${s.replace(/^#/, "")}`,
			width: Number.isFinite(l) && l > 0 ? l / 8 : 1,
			distance: Number(lt(i, "space") ?? 0)
		} : void 0;
		let u;
		if (t || r || n) {
			const e = kt(lt(t, "w"), 816), o = kt(lt(t, "h"), 1056), i = lt(t, "orient");
			u = {
				width: e,
				height: o,
				orientation: "landscape" === i ? "landscape" : "portrait" === i ? "portrait" : e > o ? "landscape" : "portrait",
				margins: {
					top: kt(lt(r, "top"), 96),
					right: kt(lt(r, "right"), 96),
					bottom: kt(lt(r, "bottom"), 96),
					left: kt(lt(r, "left"), 96),
					header: kt(lt(r, "header"), 48),
					footer: kt(lt(r, "footer"), 48),
					gutter: kt(lt(r, "gutter"), 0)
				},
				...n ? { columns: n } : {}
			};
		}
		const d = (t) => {
			const r = {};
			for (const n of rt(e, Qe, t)) {
				const e = n.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "type") || "default";
				if ("default" !== e && "first" !== e && "even" !== e) continue;
				const t = n.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
				t && (r[e] = t);
			}
			return r;
		}, p = d("headerReference"), f = d("footerReference"), h = it(e, Qe, "docGrid"), m = lt(h, "type"), g = kt(lt(h, "linePitch"), NaN), w = lt(it(e, Qe, "type"), "val"), b = "continuous" === w || "nextPage" === w || "evenPage" === w || "oddPage" === w || "nextColumn" === w ? w : void 0, v = it(e, Qe, "pgNumType");
		let y;
		if (v) {
			const e = lt(v, "start"), t = null !== e ? Number.parseInt(e, 10) : void 0, r = lt(v, "fmt") ?? void 0, n = lt(v, "chapStyle") ?? void 0, o = lt(v, "chapSep") ?? void 0;
			(void 0 !== t && Number.isFinite(t) || r || n || o) && (y = {
				...void 0 !== t && Number.isFinite(t) ? { start: t } : {},
				...r ? { format: r } : {},
				...n ? { chapterStyle: n } : {},
				...o ? { chapterSeparator: o } : {}
			});
		}
		const x = lt(it(e, Qe, "vAlign"), "val"), E = "center" === x || "both" === x || "bottom" === x ? x : void 0, N = pt(e, "bidi"), S = it(e, Qe, "sectPrChange"), k = or(S), T = it(S, Qe, "sectPr"), I = k && T ? {
			...k,
			type: "property",
			previous: (_ = qr(T), C = u, {
				pageSettings: _.pageSettings ?? C ?? zr,
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
			verticalAlignment: E,
			bidi: N,
			propertyRevision: I
		};
	}
	function Wr(e) {
		if (!e) return;
		const t = it(e, Qe, "sectPr");
		if (!t) return;
		const r = it(t, Qe, "pgSz"), n = it(t, Qe, "pgMar"), o = jr(t);
		if (!r && !n && !o) return;
		const i = kt(lt(r, "w"), 816), a = kt(lt(r, "h"), 1056), s = lt(r, "orient");
		return {
			width: i,
			height: a,
			orientation: "landscape" === s ? "landscape" : "portrait" === s ? "portrait" : i > a ? "landscape" : "portrait",
			margins: {
				top: kt(lt(n, "top"), 96),
				right: kt(lt(n, "right"), 96),
				bottom: kt(lt(n, "bottom"), 96),
				left: kt(lt(n, "left"), 96),
				header: kt(lt(n, "header"), 48),
				footer: kt(lt(n, "footer"), 48),
				gutter: kt(lt(n, "gutter"), 0)
			},
			...o ? { columns: o } : {}
		};
	}
	function Vr(e, t, r, n, o) {
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
			if (o.adjustLineHeightInTable) for (const e of i.rows) for (const i of e.cells) Vr(i.blocks, t, r, n, o);
		}
	}
	function Gr(e) {
		const t = e[0];
		return e.every((e) => {
			return !(e.bookmark || e.comment || e.opaque || e.image || e.textBox || e.math || e.sym || e.footnoteReference || e.endnoteReference || e.revision || e.revisionRangeMarker || e.sdtWrappers?.length || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.styles?.link || (r = t?.styles, n = e.styles, JSON.stringify(r ?? null) !== JSON.stringify(n ?? null)));
			var r, n;
		});
	}
	const Xr = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", Zr = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", Yr = "http://schemas.openxmlformats.org/drawingml/2006/main", Qr = "http://schemas.openxmlformats.org/markup-compatibility/2006", Kr = "http://www.w3.org/2000/xmlns/", Jr = "urn:schemas-microsoft-com:office:office", en = "urn:schemas-microsoft-com:vml", tn = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape", rn = "http://schemas.openxmlformats.org/drawingml/2006/chart", nn = "http://schemas.openxmlformats.org/drawingml/2006/diagram", on = (e) => Array.from(e.childNodes).filter((e) => 1 === e.nodeType), an = (e, t, r) => Array.from(e.getElementsByTagNameNS(t, r)), sn = (e, t, r) => e.namespaceURI === t && e.localName === r, ln = (e, t) => e < t ? -1 : e > t ? 1 : 0, cn = (e, t) => Object.hasOwn(e, t);
	function un(e) {
		if (sn(e, Xr, "object")) return "embedded";
		if (sn(e, Xr, "pict")) return an(e, Jr, "OLEObject").length ? "embedded" : an(e, en, "imagedata").length ? void 0 : "vml";
		if (!sn(e, Xr, "drawing")) return;
		const t = an(e, Yr, "graphicData");
		if (!t.length) return "drawing";
		for (const r of t) {
			const e = r.getAttribute("uri");
			if (e === rn || an(r, rn, "chart").length) return "chart";
			if (e === nn || an(r, nn, "relIds").length) return "diagram";
			if (e && /ink/i.test(e)) return "ink";
			if ("http://schemas.openxmlformats.org/drawingml/2006/picture" !== e && e !== tn) return "drawing";
		}
	}
	function dn(e) {
		const t = [], r = [e];
		for (; r.length;) {
			const e = r.pop();
			for (const r of Array.from(e.attributes)) ("http://schemas.openxmlformats.org/officeDocument/2006/relationships" === r.namespaceURI || "http://purl.oclc.org/ooxml/officeDocument/relationships" === r.namespaceURI || r.namespaceURI === Jr && "relid" === r.localName) && r.value && t.push(r.value);
			r.push(...on(e));
		}
		return [...new Set(t)].sort(ln);
	}
	function pn(e, t) {
		const r = t ? "xmlns:" + t : "xmlns";
		for (let n = e; n; n = 1 === n.parentNode?.nodeType ? n.parentNode : null) if (n.hasAttribute(r)) return n.getAttribute(r) ?? "";
		return "xml" === t ? "http://www.w3.org/XML/1998/namespace" : "";
	}
	function fn(e) {
		const t = Array.from(e.attributes).filter((e) => e.namespaceURI !== Kr && "xmlns" !== e.name && "xmlns" !== e.prefix).map((t) => {
			const r = t.namespaceURI === Qr || sn(e, Qr, "Choice") && "Requires" === t.localName ? t.value.trim().split(/\s+/).filter(Boolean).map((t) => [t, pn(e, t.split(":")[0])]) : void 0;
			return [
				t.namespaceURI ?? "",
				t.localName ?? t.name,
				t.value,
				r
			];
		}).sort((e, t) => ln(JSON.stringify(e), JSON.stringify(t)));
		return [
			e.namespaceURI ?? "",
			e.localName,
			t,
			Array.from(e.childNodes).map((e) => 1 === e.nodeType ? fn(e) : [e.nodeType, e.nodeValue])
		];
	}
	function hn(e) {
		const t = e.cloneNode(!0), r = /* @__PURE__ */ new Map();
		for (let n = e; n; n = 1 === n.parentNode?.nodeType ? n.parentNode : null) for (const e of Array.from(n.attributes)) e.namespaceURI !== Kr && "xmlns" !== e.name && "xmlns" !== e.prefix || r.has(e.name) || r.set(e.name, e.value);
		for (const [n, o] of r) t.hasAttribute(n) || t.setAttributeNS(Kr, n, o);
		return new b.XMLSerializer().serializeToString(t);
	}
	function mn(e) {
		const t = an(e, Zr, "anchor")[0] ?? an(e, Zr, "inline")[0];
		if (!t) return;
		const r = on(t).find((e) => sn(e, Zr, "extent")), n = (e) => {
			const t = r?.getAttribute(e), n = t ? Number(t) : NaN;
			return Number.isSafeInteger(n) && n > 0 ? n : void 0;
		}, o = on(t).find((e) => e.namespaceURI === Zr && e.localName?.startsWith("wrap"))?.localName;
		return {
			placement: "anchor" === t.localName ? "anchor" : "inline",
			widthEmu: n("cx"),
			heightEmu: n("cy"),
			wrap: o ?? void 0,
			relativeHeight: t.getAttribute("relativeHeight") || void 0
		};
	}
	function gn(e, t, r) {
		const n = [], o = [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), s = r.map((e) => ({
			ownerPath: t,
			id: e
		})), l = (e, t, r, n) => o.push({
			level: "error",
			code: e,
			message: t,
			partPath: r,
			relationshipId: n
		});
		for (let c = 0; c < s.length; c++) {
			const t = s[c], r = JSON.stringify([t.ownerPath, t.id]);
			if (a.has(r)) continue;
			a.add(r);
			const o = ((cn(e.parts, t.ownerPath) ? e.parts[t.ownerPath] : void 0)?.relationships ?? []).filter((e) => e.id === t.id);
			if (1 !== o.length) {
				l(o.length ? "opaque-relationship-ambiguous" : "opaque-relationship-missing", "Cannot resolve unique opaque object relationship.", t.ownerPath, t.id);
				continue;
			}
			const u = o[0], d = u.targetMode ?? "Internal";
			if (n.push({
				ownerPath: t.ownerPath,
				relationshipId: u.id,
				type: u.type,
				target: u.target,
				targetMode: d,
				resolvedTarget: u.resolvedTarget
			}), "External" === d) continue;
			if (!u.resolvedTarget || !cn(e.parts, u.resolvedTarget)) {
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
			edges: n.sort((e, t) => ln(JSON.stringify([e.ownerPath, e.relationshipId]), JSON.stringify([t.ownerPath, t.relationshipId]))),
			partPaths: [...i].sort(ln),
			issues: o
		};
	}
	function wn(e, t) {
		if (t === e.mainDocumentPart) return !0;
		const r = e.parts[t]?.contentType ?? "";
		return /wordprocessingml\.(?:header|footer|footnotes|endnotes|comments|document\.glossary)\+xml$/.test(r);
	}
	function bn(e) {
		const t = on(e);
		return sn(e, Qr, "AlternateContent") && t.filter((e) => sn(e, Qr, "Choice")).some((e) => an(e, Yr, "graphicData").some((e) => e.getAttribute("uri") === tn && an(e, tn, "wsp").length > 0 && an(e, Xr, "txbxContent").length > 0)) ? t.filter((e) => {
			if (!sn(e, Qr, "Fallback")) return !0;
			const t = on(e);
			if (1 !== t.length || !sn(t[0], Xr, "pict")) return !0;
			const r = t[0];
			return !(an(r, en, "textbox").length > 0 && an(r, Xr, "txbxContent").length > 0 && 0 === an(r, Jr, "OLEObject").length && 0 === an(r, Xr, "object").length && 0 === an(r, Xr, "drawing").length);
		}) : t;
	}
	function vn(e) {
		return sn(e, Qr, "AlternateContent") ? bn(e).flatMap((e) => [
			"drawing",
			"pict",
			"object"
		].flatMap((t) => an(e, Xr, t))).map(un).find((e) => void 0 !== e) : un(e);
	}
	function yn(e) {
		const t = vn(e);
		if (!t) return;
		const r = mn(e), n = (e, t) => void 0 === e ? t : Math.max(1, Math.min(4096, e / 9525));
		return {
			objectKind: t,
			fragmentXml: hn(e),
			signature: JSON.stringify(fn(e)),
			relationshipIds: dn(e),
			width: n(r?.widthEmu, 180),
			height: n(r?.heightEmu, 90),
			placement: r?.placement
		};
	}
	function xn(e) {
		const t = [], r = [];
		for (const o of Object.keys(e.parts).sort(ln)) {
			const i = e.parts[o];
			if (wn(e, o) && "xml" === i.kind && /<(?:[\w.-]+:)?(?:drawing|pict|object)(?=[\s/>])/.test(i.data)) try {
				if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(i.data)) throw Error("DTD/entity declaration unsupported");
				const n = new b.DOMParser().parseFromString(i.data, "application/xml").documentElement;
				if (!n) throw Error("Missing story root");
				const a = [n];
				let s = 0;
				for (; a.length;) {
					const n = a.pop(), i = vn(n);
					if (!i) {
						a.push(...bn(n).reverse());
						continue;
					}
					const l = dn(n), c = gn(e, o, l), u = {
						kind: i,
						ownerPath: o,
						ordinal: s++,
						fragmentXml: hn(n),
						signature: JSON.stringify(fn(n)),
						geometry: mn(n),
						relationshipIds: l,
						...c
					};
					t.push(u), r.push({
						level: "warning",
						code: "opaque-object-not-editable",
						partPath: o,
						message: "Unsupported " + i + " object retained in the source inventory; editable projection and preservation after mutation are not guaranteed."
					}, ...c.issues);
				}
			} catch (n) {
				r.push({
					level: "error",
					code: "opaque-scan-failed",
					partPath: o,
					message: n instanceof Error ? n.message : String(n)
				});
			}
		}
		return {
			objects: t,
			diagnostics: r
		};
	}
	var En = class extends Error {
		diagnostics;
		constructor(e) {
			super("DOCX export blocked: opaque object preservation could not be established (" + e.length + " diagnostics)."), this.diagnostics = e, this.name = "OpaqueObjectPreservationError";
		}
	};
	const Nn = [
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
	function Sn(e) {
		if (e) return Nn.find((t) => t.id === e)?.id;
	}
	function kn(e, t) {
		switch (t) {
			case "roman": return In(e, !1);
			case "ROMAN": return In(e, !0);
			case "alphabetic": return _n(e, !1);
			case "ALPHABETIC": return _n(e, !0);
			case "Ordinal": return function(e) {
				const t = Math.floor(e), r = Math.abs(t), n = r % 100;
				if (n >= 11 && n <= 13) return `${t}th`;
				const o = r % 10;
				return `${t}${1 === o ? "st" : 2 === o ? "nd" : 3 === o ? "rd" : "th"}`;
			}(e);
			default: return String(e);
		}
	}
	const Tn = [
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
	function In(e, t) {
		if (e <= 0) return String(e);
		let r = Math.floor(e), n = "";
		for (const [o, i] of Tn) for (; r >= o;) n += i, r -= o;
		return t ? n : n.toLowerCase();
	}
	function _n(e, t) {
		if (e <= 0) return String(e);
		const r = t ? 65 : 97;
		let n = "", o = e;
		for (; o > 0;) o -= 1, n = String.fromCharCode(r + o % 26) + n, o = Math.floor(o / 26);
		return n;
	}
	const Cn = (e) => /\s/u.test(e);
	function An(e) {
		const t = [], r = (r) => ({
			raw: e,
			command: null,
			tokens: t,
			error: r
		});
		if (e.length > 65536) return r("length-limit");
		let n = 0;
		for (; n < e.length;) {
			if (Cn(e[n])) {
				n++;
				continue;
			}
			if (t.length >= 4096) return r("token-limit");
			const o = n;
			let i = "word", a = "";
			if ("\"" === e[n]) {
				i = "quoted", n++;
				let t = !1;
				for (; n < e.length;) {
					const r = e[n++];
					if ("\"" === r) {
						t = !0;
						break;
					}
					"\\" !== r || "\"" !== e[n] && "\\" !== e[n] ? a += r : a += e[n++];
				}
				if (!t) return r("unterminated-quote");
				if (n < e.length && !Cn(e[n]) && "\\" !== e[n]) return r("adjacent-quote");
			} else if ("\\" === e[n]) {
				i = "switch", n++;
				const t = e[n];
				if (!t || !/[A-Za-z*@#!]/.test(t)) return r("invalid-switch");
				if (n++, a = t, n < e.length && !Cn(e[n]) && "\"" !== e[n] && "\\" !== e[n]) for (; n < e.length && !Cn(e[n]) && "\"" !== e[n] && "\\" !== e[n];) a += e[n++];
			} else {
				for (; n < e.length && !Cn(e[n]) && "\\" !== e[n] && "\"" !== e[n];) n++;
				if ("\"" === e[n]) return r("adjacent-quote");
				a = e.slice(o, n);
			}
			t.push({
				kind: i,
				raw: e.slice(o, n),
				value: a,
				start: o,
				end: n
			});
		}
		const o = t[0];
		return o && "word" === o.kind && /^(?:[A-Za-z][A-Za-z0-9]*|=)$/.test(o.value) ? {
			raw: e,
			command: o.value.toUpperCase(),
			tokens: t
		} : r("missing-command");
	}
	function Rn(e) {
		const t = An(e);
		if (t.error) return;
		const r = t.tokens.slice(1), n = t.command;
		if ("PAGE" === n || "NUMPAGES" === n) {
			if (!r.length) return { type: n };
			if (2 !== r.length || "switch" !== r[0].kind || "*" !== r[0].value || "word" !== r[1].kind) return;
			const e = Sn(r[1].value);
			return e ? {
				type: n,
				format: e
			} : void 0;
		}
		if ("DATE" === n) {
			if (!r.length) return { type: n };
			if (2 !== r.length || "switch" !== r[0].kind || "@" !== r[0].value || "quoted" !== r[1].kind) return;
			const e = r[1].value;
			if (!e || /["\\]/.test(e)) return;
			return {
				type: n,
				dateFormat: e
			};
		}
		if ("REF" === n || "PAGEREF" === n) {
			const e = r[0];
			if (!e || "switch" === e.kind || !e.value || /["\\]/.test(e.value)) return;
			if (1 !== r.length && (2 !== r.length || "switch" !== r[1].kind || "h" !== r[1].value.toLowerCase())) return;
			return {
				type: n,
				bookmark: e.value
			};
		}
	}
	const Dn = new b.XMLSerializer();
	function $n(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType !== o.ELEMENT_NODE || "http://schemas.openxmlformats.org/officeDocument/2006/math" !== o.namespaceURI || t && o.localName !== t || r.push(o);
		}
		return r;
	}
	function Pn(e, t) {
		return $n(e, t)[0];
	}
	function Mn(e, t) {
		return e?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/math", t) ?? e?.getAttribute(`m:${t}`) ?? e?.getAttribute(t) ?? void 0;
	}
	function On(e) {
		return e ? $n(e).map(Fn) : [];
	}
	function Fn(e) {
		switch (e.localName) {
			case "r": return function(e) {
				const t = Pn(e, "t")?.textContent ?? "", r = Pn(e, "rPr"), n = r ? {
					...Pn(r, "sty") ? { script: Mn(Pn(r, "sty"), "val") } : {},
					...Pn(r, "nor") ? { normalText: !0 } : {},
					...Pn(r, "b") ? { bold: "0" !== Mn(Pn(r, "b"), "val") } : {},
					...Pn(r, "i") ? { italic: "0" !== Mn(Pn(r, "i"), "val") } : {}
				} : void 0;
				return {
					kind: "text",
					value: t,
					...n && Object.keys(n).length > 0 ? { style: n } : {}
				};
			}(e);
			case "f": return {
				kind: "fraction",
				numerator: On(Pn(e, "num")),
				denominator: On(Pn(e, "den"))
			};
			case "rad": return {
				kind: "radical",
				radicand: On(Pn(e, "e")),
				...Pn(e, "deg") ? { degree: On(Pn(e, "deg")) } : {}
			};
			case "sSub":
			case "sSup":
			case "sSubSup": return function(e, t) {
				const r = On(Pn(e, "e")), n = On(Pn(e, "sub")), o = On(Pn(e, "sup"));
				return {
					kind: t,
					base: r,
					...n.length > 0 ? { subscript: n } : {},
					...o.length > 0 ? { superscript: o } : {}
				};
			}(e, "script");
			case "d": {
				const t = Pn(e, "dPr");
				return {
					kind: "delimiter",
					children: $n(e, "e").map(On),
					...Mn(Pn(t, "begChr"), "val") ? { begin: Mn(Pn(t, "begChr"), "val") } : {},
					...Mn(Pn(t, "endChr"), "val") ? { end: Mn(Pn(t, "endChr"), "val") } : {},
					...Mn(Pn(t, "sepChr"), "val") ? { separator: Mn(Pn(t, "sepChr"), "val") } : {},
					grow: "0" !== Mn(Pn(t, "grow"), "val")
				};
			}
			case "acc": return {
				kind: "accent",
				accent: Mn(Pn(Pn(e, "accPr"), "chr"), "val") ?? "¯",
				children: On(Pn(e, "e"))
			};
			case "nary": {
				const t = Pn(e, "naryPr");
				return {
					kind: "nary",
					operator: Mn(Pn(t, "chr"), "val") ?? "∑",
					children: On(Pn(e, "e")),
					...$n(e, "sub").length > 0 ? { subscript: On(Pn(e, "sub")) } : {},
					...$n(e, "sup").length > 0 ? { superscript: On(Pn(e, "sup")) } : {},
					grow: "0" !== Mn(Pn(t, "grow"), "val")
				};
			}
			case "limLow": return {
				kind: "limit",
				operator: "low",
				base: On(Pn(e, "e")),
				limit: On(Pn(e, "lim"))
			};
			case "limUpp": return {
				kind: "limit",
				operator: "upper",
				base: On(Pn(e, "e")),
				limit: On(Pn(e, "lim"))
			};
			case "m": return {
				kind: "matrix",
				rows: $n(e, "mr").map((e) => $n(e, "e").map(On))
			};
			case "box":
			case "borderBox": return {
				kind: "box",
				children: On(Pn(e, "e")),
				border: !0
			};
			case "phant": return {
				kind: "box",
				children: On(Pn(e, "e")),
				hidden: !0
			};
			case "groupChr": return {
				kind: "accent",
				accent: Mn(Pn(Pn(e, "groupChrPr"), "chr"), "val") ?? "¯",
				children: On(Pn(e, "e"))
			};
			case "func": return {
				kind: "group",
				children: [...On(Pn(e, "fName")), ...On(Pn(e, "e"))]
			};
			default: return {
				kind: "raw",
				xml: Dn.serializeToString(e),
				fallbackText: e.textContent ?? ""
			};
		}
	}
	function Ln(e) {
		const t = "oMathPara" === e.localName ? Pn(e, "oMath") : e;
		return {
			version: 1,
			children: t ? $n(t).map(Fn) : [],
			display: "oMathPara" === e.localName,
			sourceXml: Dn.serializeToString(e)
		};
	}
	const Bn = /* @__PURE__ */ new Set([
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
	]), Un = /* @__PURE__ */ new Set(["repeatingSection", "repeatingSectionItem"]);
	function zn(e) {
		if (!e) return {};
		const t = {}, r = it(e, Qe, "alias");
		if (r) {
			const e = lt(r, "val");
			null !== e && (t.alias = e);
		}
		const n = it(e, Qe, "tag");
		if (n) {
			const e = lt(n, "val");
			null !== e && (t.tag = e);
		}
		const o = it(e, Qe, "id");
		if (o) {
			const e = lt(o, "val");
			null !== e && (t.id = e);
		}
		const i = it(e, Qe, "lock");
		if (i) {
			const e = lt(i, "val");
			null !== e && (t.lock = e);
		}
		const a = it(e, Qe, "appearance");
		if (a) {
			const e = lt(a, "val");
			null !== e && (t.appearance = e);
		}
		const s = it(e, Qe, "showingPlcHdr");
		s && (t.showingPlcHdr = dt(lt(s, "val")));
		const l = it(e, Qe, "temporary");
		l && (t.temporary = dt(lt(l, "val")));
		const c = it(e, Qe, "color");
		if (c) {
			const e = lt(c, "val");
			null !== e && (t.color = e);
		}
		const u = it(e, Qe, "placeholder");
		if (u) {
			const e = it(u, Qe, "docPart");
			if (e) {
				const r = lt(e, "val");
				null !== r && (t.placeholderDocPart = r);
			}
		}
		const d = it(e, Qe, "dataBinding");
		if (d) {
			const e = function(e) {
				const t = {}, r = lt(e, "prefixMappings"), n = lt(e, "xpath"), o = lt(e, "storeItemID");
				null !== r && (t.prefixMappings = r);
				null !== n && (t.xpath = n);
				null !== o && (t.storeItemID = o);
				if (void 0 === t.prefixMappings) {
					const r = lt(it(e, Qe, "prefixMappings"), "val");
					null !== r && (t.prefixMappings = r);
				}
				if (void 0 === t.xpath) {
					const r = lt(it(e, Qe, "xpath"), "val");
					null !== r && (t.xpath = r);
				}
				if (void 0 === t.storeItemID) {
					const r = lt(it(e, Qe, "storeItemID"), "val");
					null !== r && (t.storeItemID = r);
				}
				return void 0 === t.prefixMappings && void 0 === t.xpath && void 0 === t.storeItemID ? null : t;
			}(d);
			e && (t.dataBinding = e);
		}
		const p = function(e) {
			const t = it(e, Qe, "comboBox");
			if (t) {
				const e = it(t, Qe, "lastSelectedValue");
				return {
					kind: "comboBox",
					listItems: Hn(t),
					...e ? { lastSelectedValue: lt(e, "val") ?? void 0 } : {}
				};
			}
			const r = it(e, Qe, "dropDownList");
			if (r) {
				const e = it(r, Qe, "lastSelectedValue");
				return {
					kind: "dropDownList",
					listItems: Hn(r),
					...e ? { lastSelectedValue: lt(e, "val") ?? void 0 } : {}
				};
			}
			const n = it(e, Qe, "date");
			if (n) {
				const e = lt(n, "fullDate") ?? void 0, t = it(n, Qe, "dateFormat"), r = it(n, Qe, "lid"), o = it(n, Qe, "calendar"), i = it(n, Qe, "storeMappedDataAs");
				return {
					kind: "date",
					fullDate: e,
					dateFormat: t ? lt(t, "val") ?? void 0 : void 0,
					lid: r ? lt(r, "val") ?? void 0 : void 0,
					calendar: o ? lt(o, "val") ?? void 0 : void 0,
					storeMappedDataAs: i ? lt(i, "val") ?? void 0 : void 0
				};
			}
			if (it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "text")) return { kind: "text" };
			for (const i of [
				"richText",
				"picture",
				"group",
				"equation",
				"citation",
				"bibliography"
			]) if (it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", i)) return { kind: i };
			if (st(e, "repeatingSection") || it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection")) return { kind: "repeatingSection" };
			if (st(e, "repeatingSectionItem") || it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSectionItem")) return { kind: "repeatingSectionItem" };
			const o = at(e, "checkbox");
			if (o) {
				const e = it(o, Je, "checked"), t = it(o, Je, "checkedState"), r = it(o, Je, "uncheckedState"), n = e ? dt(lt(e, "val")) : void 0;
				return {
					kind: "checkbox",
					...void 0 !== n ? { checked: n } : {},
					...t ? {
						checkedStateFont: lt(t, "font") ?? void 0,
						checkedStateChar: lt(t, "char") ?? void 0
					} : {},
					...r ? {
						uncheckedStateFont: lt(r, "font") ?? void 0,
						uncheckedStateChar: lt(r, "char") ?? void 0
					} : {}
				};
			}
		}(e);
		if (p && (t.subtype = p, "repeatingSection" === p.kind)) {
			const r = st(e, "repeatingSection") ?? it(e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "repeatingSection");
			if (r) {
				const e = st(r, "sectionTitle"), n = st(r, "doNotAllowInsertDeleteSection"), o = {}, i = lt(e, "val");
				if (null !== i && (o.sectionTitle = i), n) {
					const e = lt(n, "val");
					o.doNotAllowInsertDeleteSection = null === e || dt(e);
				}
				Object.keys(o).length > 0 && (t.repeatingSectionProperties = o);
			}
		}
		const f = function(e) {
			let t = "";
			for (let r = 0; r < e.childNodes.length; r += 1) {
				const n = e.childNodes[r];
				if (n?.nodeType !== n.ELEMENT_NODE) continue;
				const o = n, i = o.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && Bn.has(o.localName), a = o.localName && "http://schemas.microsoft.com/office/word/2012/wordml" === o.namespaceURI && Un.has(o.localName);
				i || a || (t += new b.XMLSerializer().serializeToString(o));
			}
			return t;
		}(e);
		return f.length > 0 && (t.unknownXml = f), t;
	}
	function Hn(e) {
		const t = rt(e, Qe, "listItem");
		if (0 !== t.length) return t.map((e) => ({
			displayText: lt(e, "displayText") ?? void 0,
			value: lt(e, "value") ?? void 0
		}));
	}
	const jn = new Set(Object.keys({
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
	function qn(e) {
		return e && jn.has(e) ? e : void 0;
	}
	function Wn(e) {
		const t = Vn(e);
		return void 0 === t ? void 0 : Math.round(t / re);
	}
	function Vn(e) {
		if (null == e || "" === e) return;
		const t = parseInt(e, 10);
		return Number.isFinite(t) ? t : void 0;
	}
	function Gn(e) {
		const t = e?.trim();
		if (!t) return null;
		const r = t.match(/^(-?\d+(?:\.\d+)?)(pt|px|in|cm|mm|pc)?$/i);
		if (!r) return null;
		const n = Number(r[1]);
		if (!Number.isFinite(n) || n <= 0) return null;
		switch ((r[2] ?? "px").toLowerCase()) {
			case "pt": return Math.round(n * te);
			case "in": return Math.round(96 * n);
			case "cm": return Math.round(n / 2.54 * 96);
			case "mm": return Math.round(n / 25.4 * 96);
			case "pc": return Math.round(12 * n * te);
			default: return Math.round(n);
		}
	}
	function Xn(e) {
		const t = Ut(e);
		return t ? `#${t}` : void 0;
	}
	function Zn(e) {
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
	function Yn(e) {
		return "1" === e || "true" === e || "0" !== e && "false" !== e && void 0;
	}
	function Qn(e, t) {
		const r = ct(e, t);
		if (!r) return;
		const n = ct(r, "align")?.textContent?.trim(), o = ct(r, "posOffset")?.textContent?.trim(), i = Vn(o), a = {
			relativeFrom: r.getAttribute("relativeFrom") ?? void 0,
			...n ? { align: n } : {},
			...void 0 !== i ? { offset: i } : {}
		};
		return void 0 !== a.relativeFrom || void 0 !== a.align || void 0 !== a.offset ? a : void 0;
	}
	function Kn(e) {
		const t = Qn(e, "positionH"), r = Qn(e, "positionV"), n = function(e) {
			return ct(e, "wrapSquare") ? "square" : ct(e, "wrapTight") ? "tight" : ct(e, "wrapThrough") ? "through" : ct(e, "wrapTopAndBottom") ? "topAndBottom" : ct(e, "wrapNone") ? "none" : void 0;
		}(e), o = function(e) {
			const t = ct(e, "wrapSquare") ?? ct(e, "wrapTight") ?? ct(e, "wrapThrough");
			if (!t) return;
			const r = t.getAttribute("wrapText");
			return !r || "bothSides" === r || "left" !== r && "right" !== r && "largest" !== r && "bothSides" !== r ? void 0 : r;
		}(e), i = Vn(e.getAttribute("distT")), a = Vn(e.getAttribute("distB")), s = Vn(e.getAttribute("distL")), l = Vn(e.getAttribute("distR")), c = Yn(e.getAttribute("simplePos")), u = Vn(e.getAttribute("relativeHeight")), d = Yn(e.getAttribute("behindDoc")), p = Yn(e.getAttribute("locked")), f = Yn(e.getAttribute("layoutInCell")), h = Yn(e.getAttribute("allowOverlap"));
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
	async function Jn(e, t, r, n) {
		const o = ct(e, "blip");
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
		}(o), s = Zn(e), l = s?.element ?? e, c = ct(l, "extent"), u = ct(l, "docPr");
		let d = 300, p = 300;
		if (c) {
			const e = c.getAttribute("cx"), t = c.getAttribute("cy");
			e && (d = Math.round(parseInt(e, 10) / re)), t && (p = Math.round(parseInt(t, 10) / re));
		}
		const f = u ? lt(u, "descr") ?? lt(u, "title") : null, h = function(e) {
			const t = ct(e, "srcRect");
			if (!t) return;
			const r = (e) => {
				const r = t.getAttribute(e);
				if (null === r || "" === r) return;
				const n = parseInt(r, 10);
				return Number.isFinite(n) && 0 !== n ? n / ie : void 0;
			}, n = {
				left: r("l"),
				top: r("t"),
				right: r("r"),
				bottom: r("b")
			};
			return void 0 !== n.left || void 0 !== n.top || void 0 !== n.right || void 0 !== n.bottom ? n : void 0;
		}(e), m = function(e) {
			const t = ct(e, "pic"), r = t && ct(t, "spPr");
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
			if (ct(e, "tile")) return "tile";
		}(e), w = function(e) {
			const t = ct(e, "pic"), r = t && ct(t, "spPr");
			if (r) for (let n = 0; n < r.childNodes.length; n += 1) {
				const e = r.childNodes[n];
				if (1 !== e?.nodeType) continue;
				const t = e;
				if ("ln" !== t.localName) continue;
				const o = Xn(ct(t, "srgbClr")?.getAttribute("val"));
				if (!o) return;
				const i = { color: o }, a = Vn(t.getAttribute("w"));
				void 0 !== a && (i.widthPt = St(a / ne, 2));
				const s = qn(ct(t, "prstDash")?.getAttribute("val"));
				return s && (i.dash = s), i;
			}
		}(e), v = function(e) {
			const t = ct(e, "alphaModFix");
			if (!t) return;
			const r = t.getAttribute("amt");
			if (null === r || "" === r) return;
			const n = parseInt(r, 10);
			return Number.isFinite(n) ? Math.round(1e3 * (1 - Math.max(0, Math.min(ie, n)) / ie)) / 1e3 : void 0;
		}(e), y = function(e) {
			const t = ct(e, "xfrm");
			if (!t) return {};
			const r = {}, n = t.getAttribute("rot");
			if (n) {
				const e = parseInt(n, 10);
				Number.isFinite(e) && 0 !== e && (r.rotation = e / ae);
			}
			const o = t.getAttribute("flipH");
			"1" !== o && "true" !== o || (r.flipH = !0);
			const i = t.getAttribute("flipV");
			return "1" !== i && "true" !== i || (r.flipV = !0), r;
		}(e), x = "anchor" === s?.kind ? Kn(s.element) : void 0, E = "anchor" === s?.kind ? function(e) {
			const t = ct(e, "wrapPolygon");
			if (!t) return;
			const r = [];
			for (let n = 0; n < t.childNodes.length; n += 1) {
				const e = t.childNodes[n];
				if (1 !== e?.nodeType) continue;
				const o = e;
				if ("start" !== o.localName && "lineTo" !== o.localName) continue;
				const i = Vn(o.getAttribute("x")), a = Vn(o.getAttribute("y"));
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
			...E ? { wrapPolygon: E } : {}
		}, S = i ? r.get(i) : void 0, k = a ? r.get(a) : void 0;
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
		const T = S ?? k;
		if (T) {
			const e = await bt(t, n, T);
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
	function eo(e) {
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
	async function to(e, t, r, n) {
		const o = ct(e, "imagedata");
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
					const e = Gn(o);
					null !== e && (t.width = e);
				} else if ("height" === n) {
					const e = Gn(o);
					null !== e && (t.height = e);
				}
			}
			return t;
		}(ct(e, "shape")?.getAttribute("style")), l = function(e) {
			const t = {
				left: eo(lt(e, "cropleft")),
				top: eo(lt(e, "croptop")),
				right: eo(lt(e, "cropright")),
				bottom: eo(lt(e, "cropbottom"))
			};
			if (void 0 !== t.left || void 0 !== t.top || void 0 !== t.right || void 0 !== t.bottom) return t;
		}(o), c = lt(o, "title") ?? o.getAttribute("o:title"), u = await bt(t, n, a);
		return u ? {
			src: u,
			width: s.width ?? 300,
			height: s.height ?? 300,
			...c ? { alt: c } : {},
			...l ? { crop: l } : {}
		} : void 0;
	}
	async function ro(e, t) {
		const r = ct(e, "wsp");
		if (!r) return;
		const n = Zn(e), o = n?.element ?? e, i = ct(o, "extent"), a = Wn(i?.getAttribute("cx")) ?? 300, s = Wn(i?.getAttribute("cy")) ?? 300, l = ct(o, "docPr"), c = l ? lt(l, "name") : null, u = l ? lt(l, "descr") ?? lt(l, "title") : null, d = "anchor" === n?.kind ? Kn(n.element) : void 0, p = ct(r, "txbxContent"), f = p && t ? await t(p) : [], h = function(e) {
			const t = ct(e, "spPr");
			if (!t) return;
			const r = {}, n = ct(t, "prstGeom")?.getAttribute("prst");
			n && (r.preset = n);
			for (let o = 0; o < t.childNodes.length; o += 1) {
				const e = t.childNodes[o];
				if (e?.nodeType !== e.ELEMENT_NODE) continue;
				const n = e;
				if ("solidFill" === n.localName) {
					const e = Xn(ct(n, "srgbClr")?.getAttribute("val"));
					e && (r.fill = e);
				} else if ("ln" === n.localName) {
					const e = Vn(n.getAttribute("w"));
					void 0 !== e && (r.borderWidthPt = St(e / ne, 2));
					const t = Xn(ct(n, "srgbClr")?.getAttribute("val"));
					t && (r.borderColor = t);
				}
			}
			return Object.keys(r).length > 0 ? r : void 0;
		}(r), m = function(e) {
			const t = ct(e, "bodyPr");
			if (!t) return;
			const r = {}, n = Wn(t.getAttribute("lIns")), o = Wn(t.getAttribute("tIns")), i = Wn(t.getAttribute("rIns")), a = Wn(t.getAttribute("bIns"));
			void 0 !== n && (r.paddingLeft = n), void 0 !== o && (r.paddingTop = o), void 0 !== i && (r.paddingRight = i), void 0 !== a && (r.paddingBottom = a);
			const s = t.getAttribute("anchor");
			s && (r.anchor = s);
			const l = t.getAttribute("wrap");
			l && (r.wrap = l);
			const c = t.getAttribute("vert");
			return "vert" !== c && "vert270" !== c && "wordArtVert" !== c || (r.vert = c), ct(t, "spAutoFit") && (r.autoFit = !0), Object.keys(r).length > 0 ? r : void 0;
		}(r), g = function(e) {
			const t = ct(e, "spPr");
			if (!t) return;
			const n = Vn(ct(t, "xfrm")?.getAttribute("rot"));
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
	function no(e) {
		let t;
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			if (n?.nodeType !== n.ELEMENT_NODE) continue;
			const o = n;
			if ("Choice" !== o.localName) continue;
			const i = ct(o, "drawing");
			if (!i) continue;
			void 0 === t && (t = i);
			const a = o.getAttribute("Requires") ?? "";
			if (/\bwps\b/.test(a)) return i;
		}
		return t;
	}
	function oo(e) {
		const t = lt(e, "id");
		if (!t) return;
		if ("bookmarkEnd" === e.localName) return {
			kind: "end",
			docxId: t
		};
		const r = lt(e, "name") ?? void 0, n = lt(e, "colFirst"), o = lt(e, "colLast"), i = null !== n ? Number.parseInt(n, 10) : void 0, a = null !== o ? Number.parseInt(o, 10) : void 0;
		return {
			kind: "start",
			docxId: t,
			...void 0 !== r ? { name: r } : {},
			...void 0 === i || Number.isNaN(i) ? {} : { colFirst: i },
			...void 0 === a || Number.isNaN(a) ? {} : { colLast: a }
		};
	}
	function io(e) {
		const t = lt(e, "id");
		if (t) return {
			kind: "commentRangeEnd" === e.localName ? "end" : "start",
			docxId: t
		};
	}
	function ao(e) {
		const t = new b.XMLSerializer().serializeToString(e);
		let r = 2166136261;
		for (let n = 0; n < t.length; n += 1) r ^= t.charCodeAt(n), r = Math.imul(r, 16777619);
		return `revision:${r >>> 0}`;
	}
	function so(e) {
		const t = e.localName;
		if ("ins" !== t && "del" !== t && "moveFrom" !== t && "moveTo" !== t) return;
		const r = lt(e, "date"), n = r ? Date.parse(r) : NaN, o = "del" === t || "moveFrom" === t;
		return {
			id: lt(e, "id") ?? ao(e),
			type: o ? "delete" : "insert",
			author: lt(e, "author") ?? "Unknown",
			date: Number.isFinite(n) ? n : 0,
			..."moveFrom" === t ? { move: "from" } : "moveTo" === t ? { move: "to" } : {}
		};
	}
	function lo(e) {
		const t = /^move(From|To)Range(Start|End)$/.exec(e.localName ?? "");
		if (!t) return;
		const r = "From" === t[1] ? "from" : "to", n = "Start" === t[2] ? "start" : "end", o = lt(e, "date"), i = o ? Date.parse(o) : NaN, a = lt(e, "colFirst"), s = lt(e, "colLast"), l = null !== a ? Number.parseInt(a, 10) : NaN, c = null !== s ? Number.parseInt(s, 10) : NaN, u = lt(e, "name") ?? void 0, d = lt(e, "author") ?? void 0, p = lt(e, "displacedByCustomXml") ?? void 0;
		return {
			move: r,
			edge: n,
			id: lt(e, "id") ?? ao(e),
			...void 0 !== u ? { name: u } : {},
			...void 0 !== d ? { author: d } : {},
			...Number.isFinite(i) ? { date: i } : {},
			...Number.isFinite(l) ? { columnFirst: l } : {},
			...Number.isFinite(c) ? { columnLast: c } : {},
			...void 0 !== p ? { displacedByCustomXml: p } : {}
		};
	}
	async function co(e, t, r, n, o, i) {
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
				const e = lt(i, "type");
				f("page" === e ? "\f" : "column" === e ? "\v" : "\n");
			} else {
				if ("lastRenderedPageBreak" === i.localName) continue;
				if ("bookmarkStart" === i.localName || "bookmarkEnd" === i.localName) {
					const e = oo(i);
					e && d.push({
						offset: u,
						marker: e
					});
					continue;
				}
				if ("commentRangeStart" === i.localName || "commentRangeEnd" === i.localName) {
					const e = io(i);
					e && p.push({
						offset: u,
						marker: e
					});
					continue;
				}
				if ("proofErr" === i.localName || "commentReference" === i.localName || "permStart" === i.localName || "permEnd" === i.localName) continue;
				if ("cr" === i.localName) f("\n");
				else if ("drawing" === i.localName) {
					const e = await Jn(i, t, r, n);
					if (e.image) f(e.text), s = e.image;
					else {
						const e = await ro(i, o);
						e && (f("￼"), l = e);
					}
				} else if ("pict" === i.localName) {
					const e = await to(i, t, r, n);
					e && (f("￼"), s = e);
				} else if ("sym" === i.localName) {
					const e = lt(i, "font") ?? "", t = lt(i, "char") ?? "", r = parseInt(t, 16);
					f(Number.isFinite(r) && r > 0 ? String.fromCodePoint(r) : "?"), c = {
						font: e,
						char: t
					};
				}
			}
			else if ("AlternateContent" === i.localName) {
				const e = no(i);
				if (e) {
					const t = await ro(e, o);
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
	async function uo(e, t, r, n, o, i, a, s) {
		const l = [], c = [], u = (e) => {
			if (e.nested) return;
			const t = Rn(e.instruction);
			if (!t) return;
			const r = function(e) {
				if ("begin" !== e[0]?.fieldChar?.kind || "end" !== e.at(-1)?.fieldChar?.kind) return;
				let t = !1, r = !1;
				const n = [];
				for (let o = 0; o < e.length; o++) {
					const i = e[o];
					if (i.fieldChar) {
						if (i.fieldChar.fieldLock || i.fieldChar.dirty) return;
						if (0 === o || o === e.length - 1) continue;
						if ("separate" !== i.fieldChar.kind || t || !r) return;
						t = !0;
					} else if (void 0 !== i.fieldInstruction) {
						if (t) return;
						r = !0;
					} else {
						if (!t) return;
						n.push(i);
					}
				}
				return r && Gr(n) ? n : void 0;
			}(l.slice(e.beginIndex));
			if (!r) return;
			const n = r.map((e) => e.text).join("") || "1", o = r.find((e) => e.styles)?.styles ?? e.beginStyles;
			l.length = e.beginIndex, l.push({
				text: n,
				...o ? { styles: o } : {},
				field: t
			});
		}, d = (e, t) => {
			const r = lt(e, "fldCharType"), n = lt(e, "fldLock"), o = lt(e, "dirty"), i = "true" === n || "1" === n || "on" === n, a = "true" === o || "1" === o || "on" === o;
			if ("begin" === r) {
				const e = c.length > 0;
				for (const t of c) t.nested = !0;
				l.push({
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
					nested: e,
					...t ? { beginStyles: t } : {}
				});
			} else if ("separate" === r) l.push({
				text: "",
				fieldChar: {
					kind: "separate",
					...i ? { fieldLock: !0 } : {},
					...a ? { dirty: !0 } : {}
				},
				...t ? { styles: t } : {}
			});
			else if ("end" === r) {
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
			const r = e.textContent ?? "";
			l.push({
				text: "",
				fieldInstruction: r,
				...t ? { styles: t } : {}
			});
			const n = c[c.length - 1];
			n && (n.instruction += r);
		};
		for (let f = 0; f < e.childNodes.length; f += 1) {
			const u = e.childNodes[f];
			if (u?.nodeType !== u.ELEMENT_NODE) continue;
			const h = u;
			if ("http://schemas.openxmlformats.org/officeDocument/2006/math" === h.namespaceURI && ("oMath" === h.localName || "oMathPara" === h.localName)) {
				l.push({
					text: "￼",
					math: Ln(h)
				});
				continue;
			}
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== h.namespaceURI) continue;
			if ("bookmarkStart" === h.localName || "bookmarkEnd" === h.localName) {
				const e = oo(h);
				if (!e) continue;
				l.push({
					text: "",
					bookmark: e
				});
				continue;
			}
			if ("commentRangeStart" === h.localName || "commentRangeEnd" === h.localName) {
				const e = io(h);
				if (!e) continue;
				l.push({
					text: "",
					comment: e
				});
				continue;
			}
			const m = lo(h);
			if (m) {
				l.push({
					text: "",
					revisionRangeMarker: m
				});
				continue;
			}
			const g = so(h);
			if (g) {
				const e = await uo(h, t, r, n, o, i, a, s);
				for (const t of e) l.push({
					...t,
					revision: t.revision ?? g
				});
				continue;
			}
			if ("sdt" === h.localName) {
				const e = it(h, Qe, "sdtContent");
				if (!e) continue;
				const c = it(h, Qe, "sdtPr"), u = it(h, Qe, "sdtEndPr"), d = {
					groupId: G("sdt"),
					sdtPr: zn(c),
					...u ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(u) } : {}
				}, p = await uo(e, t, r, n, o, i, a, s);
				for (const t of p) l.push({
					...t,
					sdtWrappers: [d, ...t.sdtWrappers ?? []]
				});
				continue;
			}
			if ("r" === h.localName) {
				const e = Er(it(h, Qe, "rPr"), i), t = Array.from(h.childNodes).filter((e) => 1 === e.nodeType && !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "rPr" === e.localName)), u = t.map((e) => ({
					child: e,
					opaque: yn(e)
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
							const t = await co(h, r, n, o, s, [e]);
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
								const r = lt(e, "type");
								t += "page" === r ? "\f" : "column" === r ? "\v" : "\n";
								break;
							}
						}
					}
					c();
					continue;
				}
				if (rt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "fldChar").length > 0 || rt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instrText").length > 0 || rt(h, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "delInstrText").length > 0) {
					for (let t = 0; t < h.childNodes.length; t += 1) {
						const i = h.childNodes[t];
						if (i?.nodeType !== i.ELEMENT_NODE) continue;
						const a = i;
						if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI) {
							if ("fldChar" === a.localName) d(a, e);
							else if ("instrText" === a.localName || "delInstrText" === a.localName) p(a, e);
							else if (f(a)) {
								const t = await co(h, r, n, o, s, [a]);
								t.text.length && l.push({
									text: t.text,
									...e ? { styles: { ...e } } : {}
								});
							}
						}
					}
					continue;
				}
				const g = it(h, Qe, "footnoteReference");
				if (g) {
					const t = lt(g, "id");
					if (!t) continue;
					const r = lt(g, "customMarkFollows");
					let n = e;
					(n ??= {}).styleId ??= "footnoteReference", void 0 === n.superscript && (n.superscript = !0), l.push({
						text: "?",
						styles: n,
						footnoteReference: {
							docxId: t,
							...r ? { customMark: r } : {}
						}
					});
					continue;
				}
				const w = it(h, Qe, "endnoteReference");
				if (w) {
					const t = lt(w, "id");
					if (!t) continue;
					const r = lt(w, "customMarkFollows");
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
				const { text: b, image: v, textBox: y, innerBookmarks: x, innerComments: E, sym: N } = await co(h, r, n, o, s);
				let S = e;
				N && !S?.fontFamily && ((S ??= {}).fontFamily = N.font), a && ((S ??= {}).link = a);
				const k = [...(x ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						bookmark: e.marker
					}
				})), ...(E ?? []).map((e) => ({
					offset: e.offset,
					run: {
						text: "",
						comment: e.marker
					}
				}))];
				if (k.length > 0 && !v && !y) {
					k.sort((e, t) => e.offset - t.offset);
					let e = 0;
					for (const r of k) {
						const t = b.slice(e, r.offset);
						t.length > 0 && l.push({
							text: t,
							...S ? { styles: S } : {}
						}), l.push(r.run), e = r.offset;
					}
					const t = b.slice(e);
					t.length > 0 && l.push({
						text: t,
						...S ? { styles: S } : {}
					});
					continue;
				}
				if (0 === b.length && !v && !y) continue;
				if (l.push({
					text: b,
					...v ? { image: v } : {},
					...y ? { textBox: y } : {},
					...N ? { sym: N } : {},
					...S ? { styles: S } : {}
				}), x) for (const r of x) l.push({
					text: "",
					bookmark: r.marker
				});
				continue;
			}
			if ("fldSimple" === h.localName) {
				const e = h.getAttribute("w:instr") ?? h.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instr") ?? h.getAttribute("instr") ?? "", u = Rn(e), d = await uo(h, t, r, n, o, i, a, s), p = lt(h, "fldLock"), f = lt(h, "dirty"), m = "true" === p || "1" === p || "on" === p, g = "true" === f || "1" === f || "on" === f;
				if (!u || m || g || c.length || !Gr(d)) {
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
				let e = n.get(h.getAttribute("r:id") ?? h.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "") ?? null;
				if (!e) {
					const t = lt(h, "anchor");
					t && (e = `#${t}`);
				}
				l.push(...await uo(h, t, r, n, o, i, e, s));
			}
		}
		return l;
	}
	const po = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", fo = /<w:rPr(?:\s|\/|>)/, ho = /<w:pPr(?:\s|\/|>)/;
	function mo(e) {
		if (Array.isArray(e)) return e.map(mo);
		if (!e || "object" != typeof e) return e;
		const t = e, r = function(e) {
			return "string" == typeof e.kind || "string" == typeof e.type || Array.isArray(e.runs) || Array.isArray(e.rows) || Array.isArray(e.cells) || Array.isArray(e.blocks);
		}(t), n = {};
		for (const [o, i] of Object.entries(t).sort(([e], [t]) => e.localeCompare(t))) void 0 === i || "id" === o && r || "ooxmlSource" === o || o.startsWith("__") || (n[o] = mo(i));
		return n;
	}
	function go(e) {
		return JSON.stringify(mo(e)) ?? "undefined";
	}
	function wo(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function bo(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType === o.ELEMENT_NODE && o.namespaceURI === po && o.localName === t && r.push(o);
		}
		return r;
	}
	function vo(e, t) {
		return bo(e, t)[0];
	}
	function yo(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : void 0;
	}
	function xo(e) {
		return go(e);
	}
	function Eo(e) {
		return go({
			...e,
			text: void 0
		});
	}
	function No(e, t) {
		e.ooxmlSource = {
			xml: t,
			semanticSignature: xo(e),
			structureSignature: Eo(e)
		};
	}
	function So(e) {
		return e.ooxmlSource;
	}
	function ko(e) {
		return go(e);
	}
	function To(e) {
		return go({
			style: e.style,
			list: e.list,
			numberingRevision: e.numberingRevision
		});
	}
	function Io(e) {
		return e.ooxmlSource;
	}
	function _o(e) {
		return go(e);
	}
	function Co(e) {
		return go({ style: e.style });
	}
	function Ao(e) {
		return go({
			gridCols: e.gridCols,
			gridRevision: e.gridRevision
		});
	}
	function Ro(e) {
		return go({
			isHeader: e.isHeader,
			style: e.style,
			conditionalStyle: e.conditionalStyle
		});
	}
	function Do(e) {
		return go({
			propertyExceptions: e.propertyExceptions,
			tblPrExChangeXml: e.tblPrExChangeXml
		});
	}
	function $o(e) {
		return go({
			colSpan: e.colSpan,
			rowSpan: e.rowSpan,
			vMerge: e.vMerge,
			style: e.style,
			conditionalStyle: e.conditionalStyle,
			mergeRevisionState: e.mergeRevisionState
		});
	}
	function Po(e) {
		return e.ooxmlSource;
	}
	function Mo(e, t) {
		const r = yo(vo(t, "tblPr")), n = yo(vo(t, "tblGrid")), o = bo(t, "tr");
		return o.length === e.rows.length && o.forEach((t, r) => {
			const n = e.rows[r];
			(function(e, t) {
				const r = {};
				t.rowPropertiesXml && (r.rowProperties = {
					xml: t.rowPropertiesXml,
					semanticSignature: Ro(e)
				}), t.propertyExceptionsXml && (r.propertyExceptions = {
					xml: t.propertyExceptionsXml,
					semanticSignature: Do(e)
				}), (r.rowProperties || r.propertyExceptions) && (e.ooxmlSource = r);
			})(n, {
				rowPropertiesXml: yo(vo(t, "trPr")),
				propertyExceptionsXml: yo(vo(t, "tblPrEx"))
			});
			const o = bo(t, "tc");
			o.length === n.cells.length && o.forEach((e, t) => {
				const r = yo(vo(e, "tcPr"));
				r && function(e, t) {
					e.ooxmlSource = { cellProperties: {
						xml: t,
						semanticSignature: $o(e)
					} };
				}(n.cells[t], r);
			});
		}), {
			tablePropertiesXml: r,
			tableGridXml: n
		};
	}
	function Oo(e) {
		return e.ooxmlSource;
	}
	function Fo(e, t, r) {
		const n = new b.XMLSerializer(), o = function(e, t) {
			const r = t.serializeToString(e.cloneNode(!1)), n = r.indexOf(">");
			if (n < 0) return;
			const o = r.slice(0, n + 1), i = e.tagName;
			return o.slice(`<${i}`.length, o.endsWith("/>") ? -2 : -1).trim() || void 0;
		}(e, n), i = t ? it(t, Qe, "sectPr") : null, a = i ? void 0 : n.serializeToString(e), s = t && !i ? n.serializeToString(t) : void 0, l = function(e, t) {
			const r = [], n = (e) => {
				for (let o = 0; o < e.childNodes.length; o += 1) {
					const i = e.childNodes[o];
					if (i?.nodeType !== i.ELEMENT_NODE) continue;
					const a = i;
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "r" !== a.localName ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== a.namespaceURI || "pPr" !== a.localName && "p" !== a.localName && "tbl" !== a.localName && "txbxContent" !== a.localName) && n(a) : r.push(t.serializeToString(a));
				}
			};
			return n(e), r;
		}(e, n), c = r.some((e) => e.opaque) || l.length !== r.length ? void 0 : l;
		if (a || o || s || c) return {
			...a ? { xml: a } : {},
			...o ? { attributes: o } : {},
			...s ? { paragraphPropertiesXml: s } : {},
			...c ? { runXml: c } : {}
		};
	}
	function Lo(e) {
		const t = {
			id: G("run"),
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
		const n = r;
		return e.footnoteReference && (n.__importedFootnoteRef = { ...e.footnoteReference }), e.endnoteReference && (n.__importedEndnoteRef = { ...e.endnoteReference }), e.bookmark && (n.__importedBookmark = { ...e.bookmark }), e.comment && (n.__importedComment = { ...e.comment }), n;
	}
	function Bo(e, t, r, n, o, i) {
		const a = e.length > 0 ? e.map(Lo) : [{
			id: G("run"),
			text: "",
			kind: "text",
			...o ? { styles: { ...o } } : {}
		}], s = {
			id: G("paragraph"),
			type: "paragraph",
			runs: a
		};
		s.style = t ? { ...t } : void 0;
		for (const l of s.runs) l.styles = xr(l.styles, s.style?.styleId);
		if (s.list = r ? { ...r } : void 0, s.numberingRevision = n ? { ...n } : void 0, i?.runXml?.length === s.runs.length) for (let l = 0; l < s.runs.length; l += 1) No(s.runs[l], i.runXml[l]);
		return i && function(e, t) {
			const r = {};
			t.xml && (r.xml = t.xml, r.semanticSignature = ko(e)), t.attributes && (r.attributes = t.attributes), t.paragraphPropertiesXml && (r.paragraphProperties = {
				xml: t.paragraphPropertiesXml,
				semanticSignature: To(e)
			}), (r.xml || r.attributes || r.paragraphProperties) && (e.ooxmlSource = r);
		}(s, i), s;
	}
	function Uo(e) {
		return e.some((e) => e.image || e.textBox || e.field || e.fieldChar || void 0 !== e.fieldInstruction || e.bookmark || e.comment || e.revisionRangeMarker || e.text.replace(/\s/g, "").length > 0);
	}
	async function zo(e, t, r, n, o, i, a, s) {
		const l = it(e, Qe, "pPr"), c = await uo(e, t, r, n, o, i, void 0, a), u = Br(Ur(l, i.colors)), d = Er(it(l, Qe, "rPr"), i), p = function(e, t) {
			if (!e) return;
			const r = it(e, Qe, "numPr");
			if (!r) return;
			const n = lt(it(r, Qe, "numId"), "val");
			if (!n) return;
			const o = lt(it(r, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "ilvl"), "val") ?? "0", i = Number.parseInt(o, 10), a = Number.isFinite(i) ? i : 0, s = cr(t, n, a), l = [];
			for (let m = 0; m <= a; m += 1) l[m] = cr(t, n, m).format ?? "decimal";
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
			}, f = sr(n, 1), h = sr(t.numToAbstractId.get(n), 0);
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
			const r = it(it(e, Qe, "numPr"), Qe, "numberingChange"), n = or(r);
			if (!n) return;
			const o = lt(r, "original") ?? void 0;
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
		const g = Lr(s ? {
			...s,
			...m ?? {}
		} : m), w = function(e, t) {
			const r = it(e, Qe, "framePr");
			if (!r) return null;
			const n = lt(r, "dropCap");
			if (!n || "none" === n) return null;
			const o = t.map((e) => e.text).join("");
			if (0 === o.length) return null;
			const i = Number(lt(r, "lines"));
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
			paragraphs: [Bo(c, g, f, h, d, Fo(e, l, c))],
			pageBreakAfter: !1
		};
		const y = [];
		let x = !1;
		for (let E = 0; E < b.length; E += 1) {
			const e = b[E];
			if (E > 0 && (x = !0), !Uo(e)) continue;
			const t = x ? {
				...g ?? {},
				pageBreakBefore: !0
			} : g;
			y.push(Bo(e, t, f, h, d)), x = !1;
		}
		return {
			paragraphs: y,
			pageBreakAfter: x
		};
	}
	async function Ho(e, t, r, n, o, i, a, s) {
		return (await zo(e, t, r, n, o, i, a, s)).paragraphs[0] ?? K([{ text: "" }]);
	}
	function jo(e, t, r, n) {
		for (const o of Ye(e)) {
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== o.namespaceURI) continue;
			if (o.localName === t) {
				n.push({
					element: o,
					...r.length > 0 ? { sdtWrappers: r } : {}
				});
				continue;
			}
			if ("sdt" !== o.localName) continue;
			const e = it(o, Qe, "sdtContent");
			if (!e) continue;
			const i = it(o, Qe, "sdtPr"), a = it(o, Qe, "sdtEndPr"), s = {
				groupId: G("sdt"),
				sdtPr: zn(i),
				...a ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(a) } : {}
			};
			jo(e, t, [...r, s], n);
		}
	}
	function qo(e, t) {
		const r = [];
		return jo(e, t, [], r), r;
	}
	function Wo(e, t) {
		if (!t.every((e) => "paragraph" === e.type)) return;
		const r = rt(e, Qe, "p");
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
			const t = it(e, Qe, "spacing");
			return {
				before: dt(lt(t, "beforeAutospacing")),
				after: dt(lt(t, "afterAutospacing"))
			};
		}(it(e, Qe, "pPr"))));
	}
	function Vo(e) {
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
	async function Go(e, t, r, n, o, i, a, s) {
		const l = [], c = it(e, Qe, "tblGrid");
		if (c) for (const b of rt(c, Qe, "gridCol")) {
			const e = Tt(lt(b, "w"));
			void 0 !== e && l.push(e);
		}
		const u = it(c, Qe, "tblGridChange"), d = it(e, Qe, "tblPr"), p = lt(it(d, Qe, "tblStyle"), "val"), f = Rr(d, p ?? void 0), h = function(e) {
			const t = it(e, Qe, "tblLook"), r = (e) => {
				const r = lt(t, e);
				return null === r || "" === r ? void 0 : dt(r);
			}, n = lt(t, "val"), o = n ? Number.parseInt(n, 16) : NaN, i = (e) => Number.isFinite(o) ? 0 !== (o & e) : void 0;
			return {
				firstRow: r("firstRow") ?? i(32) ?? !0,
				lastRow: r("lastRow") ?? i(64) ?? !1,
				firstCol: r("firstColumn") ?? i(128) ?? !0,
				lastCol: r("lastColumn") ?? i(256) ?? !1,
				noHBand: r("noHBand") ?? i(512) ?? !1,
				noVBand: r("noVBand") ?? i(1024) ?? !1
			};
		}(d), m = qo(e, "tr"), g = [];
		for (let v = 0; v < m.length; v += 1) {
			const e = m[v], t = e.element, r = it(t, Qe, "trPr"), n = Ir(r), o = qo(t, "tc"), s = [];
			for (let p = 0; p < o.length; p += 1) {
				const e = o[p], t = e.element, r = it(t, Qe, "tcPr"), n = await a(t);
				Wo(t, n);
				const l = $r(r);
				if ("continue" === Mr(r) && s.length > 0) {
					const e = s[s.length - 1];
					e.colSpan = (e.colSpan ?? 1) + l;
					continue;
				}
				const c = Pr(r), u = Or(r, void 0, i.colors), d = J(n.length > 0 ? n : [K([{ text: "" }])], l, "restart" === c ? {
					rowSpan: 1,
					vMerge: c
				} : c ? { vMerge: c } : void 0);
				u && (d.style = u), d.conditionalStyle = Ir(r), e.sdtWrappers?.length && (d.sdtWrappers = [...e.sdtWrappers]);
				const f = ut(t);
				f && (d.extAttributes = f), Vo(d), "continue" === c && (d.blocks = []), s.push(d);
			}
			const l = ee(s, Fr(t) ? { isHeader: !0 } : void 0), c = Dr(r);
			c && (l.style = c), l.conditionalStyle = n, e.sdtWrappers?.length && (l.sdtWrappers = [...e.sdtWrappers]);
			const u = ut(t);
			u && (l.extAttributes = u);
			const d = it(t, Qe, "tblPrEx");
			if (d) {
				const e = Rr(d);
				e && (l.propertyExceptions = e);
				const t = it(d, Qe, "tblPrExChange");
				if (t) {
					const e = Cr(t);
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
				id: G("table"),
				type: "table",
				rows: e,
				gridCols: t
			};
		}(g, l.length > 0 ? l : void 0);
		if (f && (w.style = f), w.style ? w.style.tblLook = h : p && (w.style = { tblLook: h }), u) {
			const e = it(u, Qe, "tblGrid"), t = e ? rt(e, Qe, "gridCol").map((e) => Tt(lt(e, "w"))).filter((e) => void 0 !== e) : [], r = lt(u, "date"), n = r ? Date.parse(r) : NaN;
			w.gridRevision = {
				id: lt(u, "id") ?? "revision:grid",
				author: lt(u, "author") ?? "Unknown",
				date: Number.isFinite(n) ? n : 0,
				type: "grid",
				previous: t
			};
		}
		return function(e, t) {
			let r = "string" == typeof t ? { xml: t } : t;
			if ("string" == typeof t) {
				const n = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
				n?.namespaceURI === po && "tbl" === n.localName && (r = {
					...r,
					...Mo(e, n)
				});
			}
			const n = {
				xml: r.xml,
				semanticSignature: _o(e)
			};
			r.tablePropertiesXml && (n.tableProperties = {
				xml: r.tablePropertiesXml,
				semanticSignature: Co(e)
			}), r.tableGridXml && (n.tableGrid = {
				xml: r.tableGridXml,
				semanticSignature: Ao(e)
			}), e.ooxmlSource = n;
		}(w, new b.XMLSerializer().serializeToString(e)), w;
	}
	async function Xo(e, t, r, n, o, i, a) {
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI ? [] : "p" === e.localName ? (await zo(e, t, r, n, o, i, a)).paragraphs : "tbl" === e.localName ? [await Go(e, 0, 0, 0, 0, i, a)] : "sdt" === e.localName ? Zo(e, t, r, n, o, i, a) : [];
	}
	async function Zo(e, t, r, n, o, i, a) {
		const s = it(e, Qe, "sdtPr"), l = it(e, Qe, "sdtEndPr"), c = {
			groupId: G("sdt"),
			sdtPr: zn(s),
			...l ? { sdtEndPrXml: new b.XMLSerializer().serializeToString(l) } : {}
		}, u = it(e, Qe, "sdtContent"), d = [];
		if (u) for (let p = 0; p < u.childNodes.length; p += 1) {
			const e = u.childNodes[p];
			e?.nodeType === e.ELEMENT_NODE && d.push(...await Xo(e, t, r, n, o, i, a));
		}
		for (const p of d) p.sdtWrappers = [c, ...p.sdtWrappers ?? []];
		return d;
	}
	function Yo(e, t, r, n, o) {
		return (i) => async function(e, t, r, n, o, i) {
			const a = Yo(t, r, n, o, i), s = [];
			for (let l = 0; l < e.childNodes.length; l += 1) {
				const c = e.childNodes[l];
				c?.nodeType === c.ELEMENT_NODE && s.push(...await Xo(c, t, r, n, o, i, a));
			}
			return s;
		}(i, e, t, r, n, o);
	}
	async function Qo(e, t, r, n, o, i, a) {
		if (!e) return [];
		const s = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!s) return [];
		const l = Yo(t, r, n, o, i), c = [];
		for (let u = 0; u < s.childNodes.length; u += 1) {
			const e = s.childNodes[u];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const a = e;
			"p" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI ? c.push(await Ho(a, t, r, n, o, i, l)) : "tbl" === a.localName && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === a.namespaceURI && c.push(await Go(a, 0, 0, 0, 0, i, l));
		}
		return c;
	}
	const Ko = /* @__PURE__ */ new Set([
		"separator",
		"continuationSeparator",
		"continuationNotice"
	]);
	async function Jo(e, t, r, n, o, i, a, s) {
		const l = {
			byDocxId: /* @__PURE__ */ new Map(),
			notes: { items: {} }
		};
		if (!t) return l;
		const c = new b.DOMParser().parseFromString(t, "application/xml").documentElement;
		if (!c) return l;
		const u = {}, d = /* @__PURE__ */ new Map();
		let p, f;
		const h = rt(c, Qe, e);
		let m = 0;
		const g = Yo(r, n, o, i, a);
		for (const w of h) {
			const t = lt(w, "id") ?? "", s = lt(w, "type") ?? "", l = [];
			for (let e = 0; e < w.childNodes.length; e += 1) {
				const t = w.childNodes[e];
				if (t?.nodeType !== t.ELEMENT_NODE) continue;
				const s = t;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === s.namespaceURI && ("p" === s.localName ? l.push(await Ho(s, r, n, o, i, a, g)) : "tbl" === s.localName && l.push(await Go(s, 0, 0, 0, 0, a, g)));
			}
			if (Ko.has(s)) {
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
	function* ei(e, t) {
		const r = Me(e);
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
			for (const r of e) for (const e of r) for (const r of Fe(e)) for (const e of r.runs) e.kind === t && (yield {
				paragraph: r,
				run: e
			});
		}
	}
	function ti(e, t, r) {
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
							const o = ti(e.blocks, t, r);
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
				default: return pe(e, "block");
			}
		});
		return {
			blocks: n ? o : e,
			changed: n
		};
	}
	function ri(e, t, r) {
		const n = t.settings?.numberFormat ?? "decimal", o = t.settings?.startAt ?? 1, i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
		let s = o - 1;
		for (const { run: p } of ei(e, r.runKind)) {
			const e = r.getRef(p);
			e && (i.add(e.id), e.customMark ? a.set(e.id, e.customMark) : a.has(e.id) || (s += 1, a.set(e.id, r.formatMarker(s, n))));
		}
		let l = !1;
		const c = Me(e).map((e) => {
			const t = ti(e.blocks, r, a), n = ti(e.header, r, a), o = ti(e.firstPageHeader, r, a), i = ti(e.evenPageHeader, r, a), s = ti(e.footer, r, a), c = ti(e.firstPageFooter, r, a), u = ti(e.evenPageFooter, r, a);
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
	const ni = [
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
	function oi(e) {
		if (e <= 0) return String(e);
		let t = e, r = "";
		for (const [n, o] of ni) for (; t >= n;) r += o, t -= n;
		return r;
	}
	function ii(e) {
		if (e <= 0) return String(e);
		let t = e, r = "";
		for (; t > 0;) r = "abcdefghijklmnopqrstuvwxyz"[(t - 1) % 26] + r, t = Math.floor((t - 1) / 26);
		return r;
	}
	const ai = [
		"*",
		"†",
		"‡",
		"§",
		"¶",
		"#"
	];
	function si(e, t = "decimal") {
		switch (t) {
			case "lowerRoman": return oi(e);
			case "upperRoman": return oi(e).toUpperCase();
			case "lowerLetter": return ii(e);
			case "upperLetter": return ii(e).toUpperCase();
			case "symbol": {
				const t = (e - 1) % ai.length, r = Math.floor((e - 1) / ai.length) + 1;
				return ai[t].repeat(r);
			}
			default: return String(e);
		}
	}
	const li = {
		runKind: "footnoteReference",
		getRef: (e) => {
			const t = fe(e);
			return t ? {
				id: t.footnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: si
	};
	const ci = {
		runKind: "endnoteReference",
		getRef: (e) => {
			const t = he(e);
			return t ? {
				id: t.endnoteId,
				customMark: t.customMark
			} : void 0;
		},
		formatMarker: si
	};
	const ui = /* @__PURE__ */ new Set(["_GoBack"]);
	function di(e, t, r) {
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
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [Y("")]);
			return;
		}
		for (const n of e.rows) for (const e of n.cells) for (const n of e.blocks) di(n, t, r);
	}
	function pi(e) {
		const t = [], r = { value: 0 }, n = (e) => {
			e?.forEach((e) => di(e, t, r));
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
			if (!r || ui.has(r)) continue;
			const n = Number.parseInt(e.docxId, 10), o = i.get(e.docxId)?.shift(), l = X(), u = {
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
	function fi(e, t, r) {
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
			o.length !== e.runs.length && (e.runs = o.length > 0 ? o : [Y("")]);
			return;
		}
		for (const n of e.rows) for (const e of n.cells) for (const n of e.blocks) fi(n, t, r);
	}
	function hi(e) {
		const t = [], r = { value: 0 }, n = (e) => {
			e?.forEach((e) => fi(e, t, r));
		};
		for (const i of e) n(i.blocks), n(i.header), n(i.firstPageHeader), n(i.evenPageHeader), n(i.footer), n(i.firstPageFooter), n(i.evenPageFooter);
		const o = /* @__PURE__ */ new Map();
		for (const { marker: i, anchor: a } of t) {
			const e = o.get(i.docxId) ?? {};
			"start" === i.kind ? e.start = a : e.end = a, o.set(i.docxId, e);
		}
		return o;
	}
	const mi = "http://schemas.microsoft.com/office/word/2012/wordml";
	function gi(e) {
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
			t += gi(o);
		}
		return t;
	}
	function wi(e) {
		if (!e) return;
		const t = Date.parse(e);
		return Number.isNaN(t) ? void 0 : t;
	}
	function bi(e, t) {
		const r = /* @__PURE__ */ new Map();
		if (!e) return r;
		const n = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		if (!n) return r;
		const o = function(e) {
			const t = /* @__PURE__ */ new Map();
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return t;
			for (const n of rt(r, mi, "commentEx")) {
				const e = n.getAttributeNS(mi, "paraId");
				if (!e) continue;
				const r = n.getAttributeNS(mi, "done"), o = n.getAttributeNS(mi, "paraIdParent") || void 0;
				t.set(e, {
					resolved: "1" === r || "true" === r,
					...o ? { parentParaId: o } : {}
				});
			}
			return t;
		}(t);
		for (const i of rt(n, Qe, "comment")) {
			const e = lt(i, "id");
			if (null === e) continue;
			const t = lt(i, "author") ?? "", n = lt(i, "initials") ?? void 0, a = wi(lt(i, "date")), s = wi(i.getAttributeNS("http://schemas.microsoft.com/office/word/2023/wordml/word16du", "dateUtc")), l = rt(i, Qe, "p"), c = l.map((e) => gi(e)).join("\n").trim(), u = l.length > 0 ? lt(l[0], "paraId") ?? void 0 : void 0, d = void 0 !== u ? o.get(u) : void 0;
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
	async function vi(e, t = {}) {
		t.onProgress?.("opening-docx");
		const r = await w.default.loadAsync(e), n = await $(r), o = await W(r), i = await r.file("word/document.xml")?.async("string");
		if (!i) throw new Error("Missing word/document.xml");
		const a = vt(await r.file("word/_rels/document.xml.rels")?.async("string")), s = function(e) {
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
			for (const n of Array.from(r.getElementsByTagNameNS(Qe, "abstractNum"))) {
				const e = lt(n, "abstractNumId");
				if (e) for (const r of rt(n, Qe, "lvl")) {
					const n = lt(r, "ilvl") ?? "0";
					t.abstractLevels.set(`${e}:${n}`, lr(r));
				}
			}
			for (const n of Array.from(r.getElementsByTagNameNS(Qe, "num"))) {
				const e = lt(n, "numId"), r = lt(it(n, Qe, "abstractNumId"), "val");
				if (e && r) {
					t.numToAbstractId.set(e, r);
					for (const r of rt(n, Qe, "lvlOverride")) {
						const n = lt(r, "ilvl") ?? "0", o = it(r, Qe, "lvl");
						o && t.numOverrideLevels.set(`${e}:${n}`, lr(o));
						const i = ar(it(r, Qe, "startOverride"));
						void 0 !== i && t.numStartOverrides.set(`${e}:${n}`, i);
					}
				}
			}
			return t;
		}(await r.file("word/numbering.xml")?.async("string") ?? null), l = await r.file("word/settings.xml")?.async("string") ?? null, c = function(e) {
			const t = { adjustLineHeightInTable: !0 };
			if (!e) return t;
			const r = new b.DOMParser().parseFromString(e, "application/xml"), n = Tt(lt(it(r.documentElement, Qe, "defaultTabStop"), "val"));
			void 0 !== n && Number.isFinite(n) && n > 0 && (t.defaultTabStop = n);
			const o = it(r.documentElement, Qe, "autoHyphenation");
			if (o) {
				const e = lt(o, "val");
				t.autoHyphenation = "0" !== e && "false" !== e;
			}
			const i = it(r.documentElement, Qe, "doNotHyphenateCaps");
			if (i) {
				const e = lt(i, "val");
				t.doNotHyphenateCaps = "0" !== e && "false" !== e;
			}
			const a = Number.parseInt(lt(it(r.documentElement, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "consecutiveHyphenLimit"), "val") ?? "", 10);
			Number.isFinite(a) && a >= 0 && (t.consecutiveHyphenLimit = a);
			const s = Tt(lt(it(r.documentElement, Qe, "hyphenationZone"), "val"));
			void 0 !== s && (t.hyphenationZone = s), t.footnoteSettings = Ot(it(r.documentElement, Qe, "footnotePr")), t.endnoteSettings = Ot(it(r.documentElement, Qe, "endnotePr"));
			const l = it(r.documentElement, Qe, "compat");
			if (l) {
				const e = it(l, Qe, "adjustLineHeightInTable");
				if (e) {
					const r = lt(e, "val");
					t.adjustLineHeightInTable = "0" !== r && "false" !== r;
				}
				const r = it(l, Qe, "allowSpaceOfSameStyleInTable");
				if (r) {
					const e = lt(r, "val");
					t.allowSpaceOfSameStyleInTable = "0" !== e && "false" !== e;
				}
			}
			return t;
		}(l), u = function(e) {
			if (!(!e || e.length > 1048576 || /<!DOCTYPE|<!ENTITY/i.test(e))) try {
				const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
				if (!t || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== t.namespaceURI || "settings" !== t.localName) return;
				const r = er(t, Qe, "docVars");
				if (1 !== r.length) return;
				const n = er(r[0], Qe, "docVar");
				if (n.length > 256) return;
				const o = /* @__PURE__ */ new Map();
				for (const e of n) {
					const t = e.getAttributeNS(Qe, "name"), r = e.getAttributeNS(Qe, "val");
					if (null === t || null === r || !Kt(t) || !Jt(r)) continue;
					const n = t.toLowerCase();
					"__proto__" !== n && "constructor" !== n && "prototype" !== n && (o.has(n) ? o.set(n, null) : o.set(n, {
						name: t,
						value: r
					}));
				}
				const i = Object.create(null);
				for (const e of o.values()) e && (i[e.name] = e.value);
				return Object.keys(i).length ? i : void 0;
			} catch {
				return;
			}
		}(l), d = await r.file("word/styles.xml")?.async("string") ?? null, p = function(e) {
			if (!e) return;
			const t = new b.DOMParser().parseFromString(e, "application/xml").getElementsByTagNameNS(Qe, "fonts")[0];
			if (!t) return;
			const r = [];
			for (const n of rt(t, Qe, "font")) {
				const e = lt(n, "name");
				if (!e) continue;
				const t = { name: e }, o = lt(it(n, Qe, "altName"), "val");
				o && (t.altName = o);
				const i = lt(it(n, Qe, "family"), "val");
				i && (t.family = i);
				const a = lt(it(n, Qe, "pitch"), "val");
				a && (t.pitch = a);
				const s = lt(it(n, Qe, "charset"), "val");
				s && (t.charset = s);
				const l = lt(it(n, Qe, "panose1"), "val");
				l && (t.panose1 = l);
				const c = it(n, Qe, "sig");
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
		}(await r.file("word/fontTable.xml")?.async("string") ?? null), f = await r.file("word/theme/theme1.xml")?.async("string") ?? null, h = null !== f, m = $t(f), g = function(e, t) {
			if (!e) return;
			const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			if (!r) return;
			const n = it(r, Qe, "docDefaults"), o = it(it(n, Qe, "pPrDefault"), Qe, "pPr"), i = it(it(n, Qe, "rPrDefault"), Qe, "rPr"), a = o ? {
				spacingBefore: 0,
				spacingAfter: 0,
				...Br(Ur(o, t.colors))
			} : Br(Ur(o, t.colors)), s = Er(i, t), l = {};
			let c;
			for (const u of rt(r, Qe, "style")) {
				const e = lt(u, "styleId"), r = lt(u, "type");
				if (!e || "paragraph" !== r && "character" !== r && "table" !== r) continue;
				const n = lt(it(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "name"), "val") ?? e, o = lt(u, "customStyle"), i = null == o ? void 0 : dt(o), d = pr({
					id: e,
					name: n,
					type: r,
					customStyle: i
				}), p = lt(it(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "basedOn"), "val") ?? void 0, f = lt(it(u, "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "next"), "val") ?? void 0, h = pt(u, "qFormat"), m = pt(u, "semiHidden"), g = pt(u, "unhideWhenUsed"), w = lt(it(u, Qe, "uiPriority"), "val"), b = null === w ? NaN : Number(w), v = Number.isInteger(b) && b >= 0 ? b : void 0, y = Br(Ur(it(u, Qe, "pPr"), t.colors)), x = Er(it(u, Qe, "rPr"), t);
				let E;
				if ("table" === r) {
					const r = it(u, Qe, "tblPr"), n = (e) => {
						const t = lt(it(r, Qe, e), "val"), n = t ? Number(t) : NaN;
						return Number.isFinite(n) && n > 0 ? Math.floor(n) : void 0;
					}, o = n("tblStyleRowBandSize"), i = n("tblStyleColBandSize"), a = {};
					for (const e of rt(u, Qe, "tblStylePr")) {
						const r = lt(e, "type");
						if (!r) continue;
						const n = it(e, Qe, "tcPr"), o = Or(n, void 0, t.colors), i = Rr(it(e, Qe, "tblPr")), s = br(it(n, Qe, "shd"), t.colors), l = Er(it(e, Qe, "rPr"), t), c = gr(hr(it(n, Qe, "tcBorders"))), u = Ur(it(e, Qe, "pPr"), t.colors), d = Dr(it(e, Qe, "trPr"));
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
					E = {
						...Rr(r, e) ?? { styleId: e },
						...void 0 !== o ? { rowBandSize: o } : {},
						...void 0 !== i ? { colBandSize: i } : {},
						...Object.keys(a).length > 0 ? { conditionalFormats: a } : {}
					};
				}
				const N = "paragraph" === r && dt(lt(u, "default"));
				N && (c = e), l[e] = {
					id: e,
					name: n,
					type: r,
					...d ? { builtinStyle: d } : {},
					...void 0 !== i ? { customStyle: i } : {},
					isDefault: dt(lt(u, "default")),
					basedOn: p,
					nextStyle: f,
					qFormat: h,
					uiPriority: v,
					semiHidden: m,
					unhideWhenUsed: g,
					paragraphStyle: "paragraph" === r && N ? wr(a, y) : y,
					textStyle: "paragraph" === r && N ? wr(s, x) : x,
					tableStyle: E
				};
			}
			return c && l[c] ? l : ((a || s) && (l.Normal = {
				id: "Normal",
				name: "Normal",
				type: "paragraph",
				builtinStyle: "normal",
				paragraphStyle: a,
				textStyle: s
			}), gr(l));
		}(d, m);
		t.onProgress?.("parsing-document");
		const v = new b.DOMParser().parseFromString(i, "application/xml"), y = v.documentElement ? it(v.documentElement, Qe, "background") : null, x = y?.getAttribute("w:color") ?? y?.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "color") ?? null, E = v.getElementsByTagNameNS(Qe, "body")[0];
		if (!E) return {
			...Be([K([{ text: "" }])]),
			...n ? { coreTimestamps: n } : {},
			...u ? { documentVariables: u } : {},
			...o ? { documentProperties: o } : {}
		};
		const N = {
			assets: {},
			byPath: /* @__PURE__ */ new Map(),
			nextId: 1
		};
		let S = null;
		const k = [], T = [[]];
		let I = !1, _ = null;
		const C = (e) => {
			I && (e.style = {
				...e.style ?? {},
				pageBreakBefore: !0
			}, I = !1), _ && "paragraph" === e.type && (e.dropCap = _, _ = null), T[T.length - 1].push(e);
		};
		let A = 0;
		for (let w = 0; w < E.childNodes.length; w += 1) {
			const e = E.childNodes[w];
			if (e?.nodeType === e.ELEMENT_NODE) {
				const t = e;
				"http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && "sectPr" !== t.localName && (A += 1);
			}
		}
		let R = 0;
		const D = () => {
			R += 1, A > 0 && t.onProgress?.("parsing-document", R / A);
		}, P = Yo(s, r, a, N, m);
		for (let w = 0; w < E.childNodes.length; w += 1) {
			const e = E.childNodes[w];
			if (e?.nodeType !== e.ELEMENT_NODE) continue;
			const t = e;
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI) {
				if ("sectPr" === t.localName) k.push(qr(t)), T.push([]), I = !1;
				else if ("p" === t.localName) {
					const e = await zo(t, s, r, a, N, m, P);
					for (const t of e.paragraphs) C(t);
					e.dropCapFrame && (_ = e.dropCapFrame), e.pageBreakAfter && (I = !0);
					const n = it(t, Qe, "pPr"), o = n ? it(n, Qe, "sectPr") : null;
					o && (k.push(qr(o)), T.push([]), I = !1), D();
				} else if ("tbl" === t.localName) C(await Go(t, 0, 0, 0, 0, m, P)), D();
				else if ("sdt" === t.localName) {
					for (const e of await Zo(t, s, r, a, N, m, P)) C(e);
					D();
				}
				await ht(50, R);
			}
		}
		if (0 === k.length) {
			const e = it(E, Qe, "sectPr");
			k.push(e ? qr(e) : {
				pageSettings: Wr(E),
				headerRIds: {},
				footerRIds: {}
			});
		}
		t.onProgress?.("parsing-headers-footers");
		const M = [], O = (e) => Object.keys(e.headerRIds).length > 0 || Object.keys(e.footerRIds).length > 0, F = k.filter(O).length;
		let L = 0;
		const B = () => {
			L += 1, F > 0 && t.onProgress?.("parsing-headers-footers", L / F);
		};
		for (let w = 0; w < k.length; w += 1) {
			const e = k[w], t = T[w] ?? [];
			Vr(t, e.docGridLinePitchPx, e.docGridMode, e.docGridType, c);
			const n = async (t) => {
				if (!t) return [];
				const n = a.get(t);
				if (!n) return [];
				let o = n.startsWith("/") ? n.slice(1) : n;
				o.startsWith("word/") || (o = `word/${n}`);
				const i = await r.file(o)?.async("string"), l = await yt(r, o);
				if (!S && i) {
					const e = i.match(/<v:textpath[^>]*string="([^"]+)"/i), t = i.match(/<v:shape\b([^>]*)>/i)?.[1] ?? "", n = (e) => t.match(new RegExp(`${e}="([^"]+)"`, "i"))?.[1], o = (e) => e.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
					if (e?.[1]) S = {
						kind: "text",
						text: o(e[1]),
						color: n("fillcolor"),
						opacity: Number(n("fillopacity")) || void 0,
						rotation: Number(n("rotation")) || void 0
					};
					else {
						const e = i.match(/<v:imagedata[^>]*(?:r:id|id)="([^"]+)"/i)?.[1], t = e ? l.get(e) : void 0;
						if (t) {
							const e = t.startsWith("../") ? `word/${t.slice(3)}` : t, o = await bt(r, N, e);
							o && (S = {
								kind: "image",
								src: o,
								color: n("fillcolor"),
								opacity: Number(n("fillopacity")) || void 0,
								rotation: Number(n("rotation")) || void 0
							});
						}
					}
				}
				const u = await Qo(i ?? null, s, r, l, N, m);
				return Vr(u, e.docGridLinePitchPx, e.docGridMode, e.docGridType, c), u;
			}, o = await n(e.headerRIds.default), i = await n(e.headerRIds.first), l = await n(e.headerRIds.even), u = await n(e.footerRIds.default), d = await n(e.footerRIds.first), p = await n(e.footerRIds.even);
			O(e) && B(), await ht(2, L);
			const f = Ee(e.pageSettings ?? {
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
			}), h = w > 0 ? k[w - 1]?.breakType : void 0, g = e.pageNumbering, b = e.verticalAlignment, v = e.bidi, y = e.propertyRevision ? {
				...e.propertyRevision,
				previous: {
					...e.propertyRevision.previous,
					pageSettings: Ee(e.propertyRevision.previous.pageSettings)
				}
			} : void 0;
			M.push({
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
		const U = await r.file("word/footnotes.xml")?.async("string") ?? null, H = await async function(e, t, r, n, o, i) {
			const a = await Jo("footnote", e, t, r, n, o, i);
			return {
				byDocxId: a.byDocxId,
				footnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(U, s, r, U ? await yt(r, "word/footnotes.xml") : /* @__PURE__ */ new Map(), N, m);
		c.footnoteSettings && (H.footnotes.settings = c.footnoteSettings);
		const j = Object.keys(H.footnotes.items).length > 0 || H.footnotes.separator || H.footnotes.continuationSeparator || H.footnotes.settings ? H.footnotes : void 0;
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
			yi(e, r);
		})(M, H.byDocxId);
		const q = await r.file("word/endnotes.xml")?.async("string") ?? null, G = await async function(e, t, r, n, o, i) {
			const a = await Jo("endnote", e, t, r, n, o, i);
			return {
				byDocxId: a.byDocxId,
				endnotes: a.notes,
				separator: a.separator,
				continuationSeparator: a.continuationSeparator
			};
		}(q, s, r, q ? await yt(r, "word/endnotes.xml") : /* @__PURE__ */ new Map(), N, m);
		c.endnoteSettings && (G.endnotes.settings = c.endnoteSettings);
		const X = Object.keys(G.endnotes.items).length > 0 || G.endnotes.separator || G.endnotes.continuationSeparator || G.endnotes.settings ? G.endnotes : void 0;
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
			yi(e, r);
		})(M, G.byDocxId);
		const Y = pi(M), Q = function(e, t) {
			const r = /* @__PURE__ */ new Set([...e.keys(), ...t.keys()]);
			if (0 === r.size) return;
			const n = [...r].sort((e, t) => {
				const r = Number.parseInt(e, 10), n = Number.parseInt(t, 10);
				return Number.isNaN(r) || Number.isNaN(n) ? e.localeCompare(t) : r - n;
			}), o = /* @__PURE__ */ new Map();
			for (const l of n) o.set(l, Z());
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
		}(hi(M), bi(await r.file("word/comments.xml")?.async("string") ?? null, await r.file("word/commentsExtended.xml")?.async("string") ?? null)), J = M.length > 1 || M.some((e) => (e.header?.length ?? 0) > 0 || (e.firstPageHeader?.length ?? 0) > 0 || (e.evenPageHeader?.length ?? 0) > 0 || (e.footer?.length ?? 0) > 0 || (e.firstPageFooter?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0 || void 0 !== e.breakType || void 0 !== e.pageNumbering || void 0 !== e.verticalAlignment || void 0 !== e.bidi || void 0 !== e.pageBorder), ee = Object.keys(N.assets).length > 0, te = (e) => {
			if (h) {
				const t = m.data?.name?.toLowerCase() ?? "", r = [
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
					...m.data ? { themeData: m.data } : {}
				};
			}
			x && (e.design = {
				...e.design ?? {},
				pageColor: `#${x.replace(/^#/, "")}`
			}), S && (e.design = {
				...e.design ?? {},
				watermark: S
			});
			const t = {};
			void 0 !== c.defaultTabStop && (t.defaultTabStop = c.defaultTabStop), c.allowSpaceOfSameStyleInTable && (t.allowSpaceOfSameStyleInTable = !0), c.autoHyphenation && (t.autoHyphenation = !0), c.doNotHyphenateCaps && (t.doNotHyphenateCaps = !0), void 0 !== c.consecutiveHyphenLimit && (t.consecutiveHyphenLimit = c.consecutiveHyphenLimit), void 0 !== c.hyphenationZone && (t.hyphenationZone = c.hyphenationZone), Object.keys(t).length > 0 && (e.settings = {
				...e.settings ?? {},
				...t
			}), p && (e.fontTable = p), n && (e.coreTimestamps = n), o && (e.documentProperties = o), u && (e.documentVariables = u);
			let r = e;
			return j && (r.footnotes = j, r = function(e) {
				const t = e.footnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: r, sectionsChanged: n, nextItems: o, itemsChanged: i } = ri(e, t, li);
				return n || i ? {
					...e,
					sections: n ? r : e.sections,
					footnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(r)), X && (r.endnotes = X, r = function(e) {
				const t = e.endnotes;
				if (!t || 0 === Object.keys(t.items).length) return e;
				const { sections: r, sectionsChanged: n, nextItems: o, itemsChanged: i } = ri(e, t, ci);
				return n || i ? {
					...e,
					sections: n ? r : e.sections,
					endnotes: {
						...t,
						items: i ? o : t.items
					}
				} : e;
			}(r)), Y && (r.bookmarks = Y), Q && (r.comments = Q), r;
		};
		if (J) {
			const e = Be([]);
			return e.sections = M, 1 === M.length && (e.pageSettings = M[0].pageSettings), g && (e.styles = g), ee && (e.assets = N.assets), te(e);
		}
		const re = M[0], ne = Be(re?.blocks.length > 0 ? re.blocks : [K([{ text: "" }])], re?.pageSettings);
		return ee && (ne.assets = N.assets), g && (ne.styles = g), te(ne);
	}
	function yi(e, t) {
		for (const r of e) r.blocks.forEach(t), r.header?.forEach(t), r.firstPageHeader?.forEach(t), r.evenPageHeader?.forEach(t), r.footer?.forEach(t), r.firstPageFooter?.forEach(t), r.evenPageFooter?.forEach(t);
	}
	function xi(e) {
		if ("end" === e.kind) return `<w:bookmarkEnd w:id="${e.wId}"/>`;
		const t = (void 0 !== e.colFirst ? ` w:colFirst="${e.colFirst}"` : "") + (void 0 !== e.colLast ? ` w:colLast="${e.colLast}"` : "");
		return `<w:bookmarkStart w:id="${e.wId}" w:name="${Vt(e.name ?? "")}"${t}/>`;
	}
	function Ei(e) {
		switch (e.kind) {
			case "start": return `<w:commentRangeStart w:id="${e.wId}"/>`;
			case "end": return `<w:commentRangeEnd w:id="${e.wId}"/>`;
			case "reference": return `<w:r><w:commentReference w:id="${e.wId}"/></w:r>`;
		}
	}
	const Ni = `xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"`;
	function Si(e) {
		const t = e.comments.map(({ comment: e, wId: t, paraId: r }) => {
			const n = void 0 !== e.date ? ` w:date="${new Date(e.date).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", o = void 0 !== e.dateUtc ? ` w16du:dateUtc="${new Date(e.dateUtc).toISOString().replace(/\.\d{3}Z$/, "Z")}"` : "", i = e.initials ? ` w:initials="${Vt(e.initials)}"` : "";
			return `<w:comment w:id="${t}" w:author="${Vt(e.author)}"${n}${o}${i}><w:p w14:paraId="${r}">${a = e.text, `<w:r>${a.split("\n").map((e, t) => `${t > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${Vt(e)}</w:t>`).join("")}</w:r>`}</w:p></w:comment>`;
			var a;
		}).join("");
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${Ni}>${t}</w:comments>`;
	}
	function ki(e) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= 1;
	}
	function Ti(e) {
		let t = 1;
		for (const n of Object.values(e)) ki(n.docxId) && (t = Math.max(t, n.docxId + 1));
		const r = /* @__PURE__ */ new Set();
		return (e) => {
			if (ki(e.docxId) && !r.has(e.docxId)) return r.add(e.docxId), e.docxId;
			for (; r.has(t);) t += 1;
			const n = t;
			return r.add(n), t += 1, n;
		};
	}
	const Ii = [
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
	], _i = [
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
	], Ci = [
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
	], Ai = [
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
	function Ri(e, t) {
		const r = e.includes(":") ? e.split(":")[1] : e, n = t.indexOf(r);
		return n >= 0 ? n : 9999;
	}
	const Di = [
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
	function $i(e, t) {
		return e.map((e, r) => {
			const n = /^<w:([\w]+)(?=[\s/>])/.exec(e)?.[1], o = e.startsWith("<mc:AlternateContent") ? /<mc:Fallback>\s*<w:([\w]+)(?=[\s/>])/.exec(e)?.[1] : void 0, i = t.findIndex((e) => e.endsWith("PrChange"));
			return {
				xml: e,
				index: r,
				rank: n || o ? Ri(n ?? o, t) : i < 0 ? 9999 : i - .5
			};
		}).sort((e, t) => e.rank - t.rank || e.index - t.index).map((e) => e.xml).join("");
	}
	function Pi(e, t = "000000") {
		return "none" === e.type || e.width <= 0 ? "w:val=\"nil\"/>" : `w:val="${"dotted" === e.type ? "dotted" : "dashed" === e.type ? "dashed" : "single"}" w:sz="${Math.max(1, Math.round(8 * e.width))}" w:space="0" w:color="${Yt(e.color, t)}"/>`;
	}
	function Mi(e) {
		const t = [
			["top", e.borderTop],
			["left", e.borderLeft],
			["bottom", e.borderBottom],
			["right", e.borderRight],
			["between", e.borderBetween],
			["bar", e.borderBar]
		].filter((e) => null != e[1]).map(([e, t]) => `<w:${e} ${Pi(t)}`);
		return t.length > 0 ? `<w:pBdr>${t.join("")}</w:pBdr>` : "";
	}
	const Oi = "6F6F6F";
	function Fi(e) {
		return e ? Object.entries(e).map(([e, t]) => ` ${e}="${Vt(t)}"`).join("") : "";
	}
	function Li(e) {
		const t = /^\d+$/.test(e.id) ? e.id : String(Array.from(e.id).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0)), r = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${t}" w:author="${Vt(e.author)}" w:date="${r}"`;
	}
	function Bi(e) {
		if (!e || 0 === Object.keys(e).length) return "";
		const t = Nr.filter(([, t]) => void 0 !== e[t]).map(([t, r]) => `w:${t}="${e[r] ? "1" : "0"}"`).join(" ");
		return t ? `<w:cnfStyle ${t}/>` : "";
	}
	function Ui(e, t) {
		return void 0 === t ? "" : t ? `<w:${e}/>` : `<w:${e} w:val="0"/>`;
	}
	function zi(e, t, r = {}) {
		if ("number" == typeof t && Number.isFinite(t)) return `<w:${e} w:w="${Zt(t) ?? 0}" w:type="dxa"/>`;
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
	function Hi(e, t = !0) {
		return zi("tblW", e, { fallbackAuto: t });
	}
	function ji(e) {
		return Pi(e ?? {
			width: .75,
			type: "solid",
			color: `#${Oi}`
		}, Oi);
	}
	function qi(e) {
		if (!e) return "";
		const t = [], r = (e, r) => {
			void 0 !== r && Number.isFinite(r) && t.push(`<w:${e} w:w="${Zt(r) ?? 0}" w:type="dxa"/>`);
		};
		return r("top", e.top), r("left", e.left), r("bottom", e.bottom), r("right", e.right), r("start", e.start), r("end", e.end), t.length > 0 ? `<w:tblCellMar>${t.join("")}</w:tblCellMar>` : "";
	}
	function Wi(e, t) {
		const r = Math.max(1, Math.floor(e.colSpan ?? 1)), n = [], o = Bi(e.conditionalStyle);
		o && n.push(o);
		const i = function(e) {
			return zi("tcW", e);
		}(e.style?.width ?? t);
		i && n.push(i), r > 1 && n.push(`<w:gridSpan w:val="${r}"/>`), "restart" === e.vMerge ? n.push("<w:vMerge w:val=\"restart\"/>") : "continue" === e.vMerge && n.push("<w:vMerge/>"), e.style?.shading && n.push(Qt(e.style.shading));
		const a = Ui("noWrap", e.style?.noWrap);
		a && n.push(a);
		const s = Ui("tcFitText", e.style?.fitText);
		if (s && n.push(s), e.style?.headers && n.push(`<w:headers w:val="${Vt(e.style.headers)}"/>`), e.style?.verticalAlign) {
			const t = "middle" === e.style.verticalAlign ? "center" : e.style.verticalAlign;
			n.push(`<w:vAlign w:val="${t}"/>`);
		}
		e.style?.textDirection && n.push(`<w:textDirection w:val="${e.style.textDirection}"/>`), n.push(function(e) {
			const t = e.style, r = t?.padding, n = Zt(r ?? t?.paddingTop ?? 0), o = Zt(r ?? t?.paddingBottom ?? 0);
			return `<w:tcMar><w:top w:w="${n ?? 0}" w:type="dxa"/><w:left w:w="${Zt(r ?? t?.paddingLeft ?? 5.4) ?? 0}" w:type="dxa"/><w:bottom w:w="${o ?? 0}" w:type="dxa"/><w:right w:w="${Zt(r ?? t?.paddingRight ?? 5.4) ?? 0}" w:type="dxa"/>${void 0 !== t?.paddingStart ? `<w:start w:w="${Zt(t.paddingStart) ?? 0}" w:type="dxa"/>` : ""}${void 0 !== t?.paddingEnd ? `<w:end w:w="${Zt(t.paddingEnd) ?? 0}" w:type="dxa"/>` : ""}</w:tcMar>`;
		}(e)), n.push(function(e) {
			const t = [
				`<w:top ${ji(e.style?.borderTop)}`,
				`<w:left ${ji(e.style?.borderLeft)}`,
				`<w:bottom ${ji(e.style?.borderBottom)}`,
				`<w:right ${ji(e.style?.borderRight)}`
			];
			return e.style?.borderStart && t.push(`<w:start ${ji(e.style.borderStart)}`), e.style?.borderEnd && t.push(`<w:end ${ji(e.style.borderEnd)}`), e.style?.borderTopLeftToBottomRight && t.push(`<w:tl2br ${ji(e.style.borderTopLeftToBottomRight)}`), e.style?.borderTopRightToBottomLeft && t.push(`<w:tr2bl ${ji(e.style.borderTopRightToBottomLeft)}`), `<w:tcBorders>${t.join("")}</w:tcBorders>`;
		}(e));
		const l = Ui("hideMark", e.style?.hideMark);
		if (l && n.push(l), e.style?.propertyRevision) {
			const t = e.style.propertyRevision, r = Wi({
				...e,
				style: t.previous
			});
			n.push(`<w:tcPrChange ${Li(t)}>${r}</w:tcPrChange>`);
		}
		if (e.style?.revision) {
			const t = e.style.revision, r = "insert" === t.type ? "cellIns" : "delete" === t.type ? "cellDel" : "cellMerge", o = "merge" === t.type ? `${t.previous?.vMerge ? ` w:vMergeOrig="${"restart" === t.previous.vMerge ? "rest" : "cont"}"` : ""}${e.vMerge ? ` w:vMerge="${"restart" === e.vMerge ? "rest" : "cont"}"` : ""}` : "";
			n.push(`<w:${r} ${Li(t)}${o}/>`);
		}
		return n.length > 0 ? `<w:tcPr>${$i(n, Di)}</w:tcPr>` : "";
	}
	function Vi(e, t) {
		if (void 0 === t || !Number.isFinite(t)) return "";
		const r = Math.floor(t);
		return r > 0 ? `<w:${e} w:val="${r}"/>` : "";
	}
	function Gi(e, t) {
		const r = "number" == typeof e ? Zt(e) : "string" == typeof e ? Number.parseFloat(e) : null, n = null !== r && Number.isFinite(r);
		if (!n && !t) return "";
		const o = [];
		return n && o.push(`w:val="${Math.round(r)}"`), o.push(`w:hRule="${t ?? "atLeast"}"`), `<w:trHeight ${o.join(" ")}/>`;
	}
	function Xi(e) {
		if (!e) return "";
		const t = [], r = Vi("gridBefore", e.gridBefore);
		r && t.push(r);
		const n = Vi("gridAfter", e.gridAfter);
		n && t.push(n);
		const o = zi("wBefore", e.widthBefore);
		o && t.push(o);
		const i = zi("wAfter", e.widthAfter);
		i && t.push(i);
		const a = zi("tblCellSpacing", e.cellSpacing);
		a && t.push(a);
		const s = Gi(e.height, e.heightRule);
		s && t.push(s);
		const l = Ui("cantSplit", e.cantSplit);
		l && t.push(l);
		const c = Ui("hidden", e.hidden);
		c && t.push(c);
		const u = Ui("tblHeader", e.isHeader);
		return u && t.push(u), e.align && t.push(`<w:jc w:val="${e.align}"/>`), t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function Zi(e) {
		const t = [], r = Bi(e.conditionalStyle);
		r && t.push(r);
		const n = Vi("gridBefore", e.style?.gridBefore);
		n && t.push(n);
		const o = Vi("gridAfter", e.style?.gridAfter);
		o && t.push(o);
		const i = zi("wBefore", e.style?.widthBefore);
		i && t.push(i);
		const a = zi("wAfter", e.style?.widthAfter);
		a && t.push(a);
		const s = zi("tblCellSpacing", e.style?.cellSpacing);
		s && t.push(s);
		const l = function(e) {
			return Gi(e.style?.height, e.style?.heightRule);
		}(e);
		l && t.push(l);
		const c = Ui("cantSplit", e.style?.cantSplit);
		c && t.push(c), (e.style?.isHeader ?? e.isHeader) && t.push("<w:tblHeader/>");
		const u = Ui("hidden", e.style?.hidden);
		if (u && t.push(u), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`), e.style?.propertyRevision) {
			const r = e.style.propertyRevision;
			t.push(`<w:trPrChange ${Li(r)}>${Xi(r.previous)}</w:trPrChange>`);
		}
		if (e.style?.revision && "merge" !== e.style.revision.type) {
			const r = e.style.revision, n = "insert" === r.type ? "ins" : "del";
			t.push(`<w:${n} ${Li(r)}/>`);
		}
		return t.length > 0 ? `<w:trPr>${t.join("")}</w:trPr>` : "";
	}
	function Yi(e) {
		const t = e?.borders;
		if (!t) return "";
		const r = Sr.map(([e, r]) => [e, t[r]]).filter((e) => !!e[1]).map(([e, t]) => `<w:${e} ${Pi(t)}`).join("");
		return r ? `<w:tblBorders>${r}</w:tblBorders>` : "";
	}
	function Qi(e) {
		const t = [];
		if (e.style?.styleId && t.push(`<w:tblStyle w:val="${Vt(e.style.styleId)}"/>`), e.style?.tblLook) {
			const r = e.style.tblLook;
			t.push(`<w:tblLook w:firstRow="${r.firstRow ? "1" : "0"}" w:lastRow="${r.lastRow ? "1" : "0"}" w:firstColumn="${r.firstCol ? "1" : "0"}" w:lastColumn="${r.lastCol ? "1" : "0"}" w:noHBand="${r.noHBand ? "1" : "0"}" w:noVBand="${r.noVBand ? "1" : "0"}"/>`);
		}
		e.style?.altTitle && t.push(`<w:tblCaption w:val="${Vt(e.style.altTitle)}"/>`), e.style?.altDescription && t.push(`<w:tblDescription w:val="${Vt(e.style.altDescription)}"/>`);
		const r = function(e) {
			if (!e || 0 === Object.keys(e).length) return "";
			const t = (e) => {
				const t = Zt(e);
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
			return `<w:tblpPr ${Object.entries(r).filter((e) => void 0 !== e[1]).map(([e, t]) => `w:${e}="${Vt(t)}"`).join(" ")}/>`;
		}(e.style?.floating);
		r && t.push(r);
		const n = e.gridCols && e.gridCols.length > 0 ? e.gridCols.reduce((e, t) => e + t, 0) : void 0;
		t.push(Hi(e.style?.width ?? n)), e.style?.align && t.push(`<w:jc w:val="${e.style.align}"/>`);
		const o = zi("tblCellSpacing", e.style?.cellSpacing);
		o && t.push(o);
		const i = qi(e.style?.defaultCellMargins);
		i && t.push(i);
		const a = Yi(e.style);
		a && t.push(a);
		const s = zi("tblInd", e.style?.indentLeft);
		s && t.push(s), t.push(`<w:tblLayout w:type="${e.style?.layout ?? "fixed"}"/>`);
		const l = Ui("bidiVisual", e.style?.bidiVisual);
		if (l && t.push(l), e.style?.tblOverlap && t.push(`<w:tblOverlap w:val="${Vt(e.style.tblOverlap)}"/>`), e.style?.revision) {
			const r = e.style.revision, n = Qi({
				...e,
				style: r.previous
			});
			t.push(`<w:tblPrChange ${Li(r)}>${n}</w:tblPrChange>`);
		}
		return `<w:tblPr>${$i(t, Ci)}</w:tblPr>`;
	}
	function Ki(e, t, r) {
		if (!e && !t && !r) return "";
		const n = [];
		void 0 !== e?.width && n.push(Hi(e.width)), e?.align && n.push(`<w:jc w:val="${e.align}"/>`);
		const o = zi("tblCellSpacing", e?.cellSpacing);
		o && n.push(o);
		const i = zi("tblInd", e?.indentLeft);
		i && n.push(i);
		const a = e ? Yi(e) : "";
		a && n.push(a), e?.layout && n.push(`<w:tblLayout w:type="${e.layout}"/>`);
		const s = qi(e?.defaultCellMargins);
		if (s && n.push(s), r) n.push(r);
		else if (t) {
			const e = Ki(t.previous) || "<w:tblPrEx/>";
			n.push(`<w:tblPrExChange ${Li(t)}>${e}</w:tblPrExChange>`);
		}
		return n.length > 0 ? `<w:tblPrEx>${n.join("")}</w:tblPrEx>` : "";
	}
	function Ji(e, t) {
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
				return `<w:tc${Fi(r.extAttributes)}>${Wi(r, s)}${c}</w:tc>`;
			}).join("");
			return `<w:tr${Fi(r.extAttributes)}>${Ki(r.propertyExceptions, r.propertyExceptionsRevision, r.tblPrExChangeXml)}${Zi(r)}${i}</w:tr>`;
		}).join(""), i = e.gridCols ? `<w:tblGrid>${e.gridCols.map((e) => `<w:gridCol w:w="${Zt(e) ?? 0}"/>`).join("")}${e.gridRevision ? `<w:tblGridChange ${Li(e.gridRevision)}><w:tblGrid>${e.gridRevision.previous.map((e) => `<w:gridCol w:w="${Zt(e) ?? 0}"/>`).join("")}</w:tblGrid></w:tblGridChange>` : ""}</w:tblGrid>` : "";
		return `<w:tbl>${Qi(e)}${i}${o}</w:tbl>`;
	}
	const ea = "xmlns:w15=\"http://schemas.microsoft.com/office/word/2012/wordml\"";
	function ta(e) {
		if (!(void 0 !== e.alias || void 0 !== e.tag || void 0 !== e.id || void 0 !== e.lock || void 0 !== e.appearance || void 0 !== e.showingPlcHdr || void 0 !== e.temporary || void 0 !== e.color || void 0 !== e.placeholderDocPart || void 0 !== e.dataBinding || void 0 !== e.subtype || void 0 !== e.repeatingSectionProperties || (e.unknownXml ?? "").length > 0)) return "<w:sdtPr/>";
		let t = "";
		return void 0 !== e.alias && (t += `<w:alias w:val="${Vt(e.alias)}"/>`), void 0 !== e.tag && (t += `<w:tag w:val="${Vt(e.tag)}"/>`), void 0 !== e.id && (t += `<w:id w:val="${Vt(e.id)}"/>`), void 0 !== e.lock && (t += `<w:lock w:val="${Vt(e.lock)}"/>`), void 0 !== e.placeholderDocPart && (t += `<w:placeholder><w:docPart w:val="${Vt(e.placeholderDocPart)}"/></w:placeholder>`), void 0 !== e.dataBinding && (t += function(e) {
			const t = [];
			void 0 !== e.prefixMappings && t.push(`w:prefixMappings="${Vt(e.prefixMappings)}"`);
			void 0 !== e.xpath && t.push(`w:xpath="${Vt(e.xpath)}"`);
			void 0 !== e.storeItemID && t.push(`w:storeItemID="${Vt(e.storeItemID)}"`);
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
					void 0 !== e?.sectionTitle && (t += `<w15:sectionTitle w15:val="${Vt(e.sectionTitle)}"/>`);
					void 0 !== e?.doNotAllowInsertDeleteSection && (t += `<w15:doNotAllowInsertDeleteSection w15:val="${e.doNotAllowInsertDeleteSection ? "1" : "0"}"/>`);
					return t ? `<w15:repeatingSection ${ea}>${t}</w15:repeatingSection>` : `<w15:repeatingSection ${ea}/>`;
				}(t);
				case "repeatingSectionItem": return `<w15:repeatingSectionItem ${ea}/>`;
				case "comboBox":
				case "dropDownList": {
					const t = (e.listItems ?? []).map(ra).join(""), r = void 0 !== e.lastSelectedValue ? `<w:lastSelectedValue w:val="${Vt(e.lastSelectedValue)}"/>` : "";
					return `<w:${e.kind}>${t}${r}</w:${e.kind}>`;
				}
				case "date": {
					const t = void 0 !== e.fullDate ? ` w:fullDate="${Vt(e.fullDate)}"` : "";
					let r = "";
					return void 0 !== e.dateFormat && (r += `<w:dateFormat w:val="${Vt(e.dateFormat)}"/>`), void 0 !== e.lid && (r += `<w:lid w:val="${Vt(e.lid)}"/>`), void 0 !== e.calendar && (r += `<w:calendar w:val="${Vt(e.calendar)}"/>`), void 0 !== e.storeMappedDataAs && (r += `<w:storeMappedDataAs w:val="${Vt(e.storeMappedDataAs)}"/>`), `<w:date${t}>${r}</w:date>`;
				}
				case "checkbox": {
					let t = "";
					if (void 0 !== e.checked && (t += `<w14:checked w14:val="${e.checked ? "1" : "0"}"/>`), void 0 !== e.checkedStateFont || void 0 !== e.checkedStateChar) t += `<w14:checkedState${void 0 !== e.checkedStateFont ? ` w14:font="${Vt(e.checkedStateFont)}"` : ""}${void 0 !== e.checkedStateChar ? ` w14:char="${Vt(e.checkedStateChar)}"` : ""}/>`;
					if (void 0 !== e.uncheckedStateFont || void 0 !== e.uncheckedStateChar) t += `<w14:uncheckedState${void 0 !== e.uncheckedStateFont ? ` w14:font="${Vt(e.uncheckedStateFont)}"` : ""}${void 0 !== e.uncheckedStateChar ? ` w14:char="${Vt(e.uncheckedStateChar)}"` : ""}/>`;
					return `<w14:checkbox>${t}</w14:checkbox>`;
				}
				default: return e;
			}
		}(e.subtype, e.repeatingSectionProperties)), void 0 !== e.appearance && (t += `<w:appearance w:val="${Vt(e.appearance)}"/>`), void 0 !== e.showingPlcHdr && (t += `<w:showingPlcHdr w:val="${e.showingPlcHdr ? "true" : "false"}"/>`), void 0 !== e.color && (t += `<w:color w:val="${Vt(e.color)}"/>`), e.unknownXml && (t += e.unknownXml), `<w:sdtPr>${t}</w:sdtPr>`;
	}
	function ra(e) {
		return `<w:listItem${void 0 !== e.displayText ? ` w:displayText="${Vt(e.displayText)}"` : ""}${void 0 !== e.value ? ` w:value="${Vt(e.value)}"` : ""}/>`;
	}
	function na(e, t) {
		const r = [];
		for (let n = 0; n < e.childNodes.length; n += 1) {
			const o = e.childNodes[n];
			o?.nodeType === o.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === o.namespaceURI && o.localName === t && r.push(o);
		}
		return r;
	}
	function oa(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">${e}</oasis:root>`, "application/xml").documentElement;
		if (r) for (let n = 0; n < r.childNodes.length; n += 1) {
			const e = r.childNodes[n];
			if (e?.nodeType === e.ELEMENT_NODE && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) return e;
		}
	}
	function ia(e, t) {
		const r = e.ownerDocument;
		if (!r) return null;
		const n = r.createElementNS(Ht, "w:sdt"), o = oa(ta(t.sdtPr), "sdtPr");
		if (o && n.appendChild(o.cloneNode(!0)), t.sdtEndPrXml) {
			const e = oa(t.sdtEndPrXml, "sdtEndPr");
			e && n.appendChild(e.cloneNode(!0));
		}
		const i = r.createElementNS(Ht, "w:sdtContent");
		return n.appendChild(i), {
			sdt: n,
			content: i
		};
	}
	function aa(e, t) {
		let r = 0;
		for (; r < t.length;) {
			const n = t[r].wrappers[0];
			if (!n) {
				r += 1;
				continue;
			}
			let o = r + 1;
			for (; o < t.length && t[o].wrappers[0]?.groupId === n.groupId;) o += 1;
			const i = ia(e, n);
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
			aa(i.content, a), r = o;
		}
	}
	function sa(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function la(e) {
		return `${e.namespaceURI ?? ""}\0${function(e) {
			return e.localName ?? e.tagName;
		}(e)}`;
	}
	function ca(e, t, r) {
		const n = la(e[t]);
		let o = 0;
		for (let i = 0; i < t; i += 1) la(e[i]) === n && (o += 1);
		return r.filter((e) => la(e) === n)[o];
	}
	function ua(e, t) {
		(function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				if (!n || "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		})(e, t);
		const r = sa(e), n = sa(t);
		r.forEach((e, o) => {
			const i = ca(r, o, n);
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI) return void (i && ua(e, i));
			if (i) return void ua(e, i);
			const a = r.slice(o + 1).map((e, t) => ca(r, o + t + 1, n)).find((e) => Boolean(e));
			t.insertBefore(e.cloneNode(!0), a ?? null);
		});
	}
	const da = /* @__PURE__ */ new Set([
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
	]), pa = /* @__PURE__ */ new Set(["gridCol", "tblGridChange"]), fa = /* @__PURE__ */ new Set([
		"tblW",
		"jc",
		"tblCellSpacing",
		"tblInd",
		"tblBorders",
		"tblLayout",
		"tblCellMar",
		"tblPrExChange"
	]), ha = /* @__PURE__ */ new Set([
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
	]), ma = /* @__PURE__ */ new Set([
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
	function ga(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function wa(e) {
		return e.localName ?? e.tagName;
	}
	function ba(e) {
		return `${e.namespaceURI ?? ""}\0${wa(e)}`;
	}
	function va(e, t) {
		const r = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r?.namespaceURI && wa(r) === t ? r : void 0;
	}
	function ya(e, t, r, n, o) {
		if (!e || function(e) {
			return Boolean(e && wo(e.xml));
		}(e)) return t;
		if (e.semanticSignature === o) return e.xml;
		const i = va(e.xml, r), a = function(e, t) {
			if (e) {
				const r = va(e, t);
				if (r) return r;
			}
			return new b.DOMParser().parseFromString(`<w:${t} xmlns:w="${Ht}"/>`, "application/xml").documentElement;
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
		const s = ga(i), l = ga(a), c = /* @__PURE__ */ new Map();
		for (const f of l) {
			const e = ba(f), t = c.get(e) ?? [];
			t.push(f), c.set(e, t);
		}
		const u = /* @__PURE__ */ new Map();
		for (const f of s) {
			const e = ba(f), t = u.get(e) ?? 0;
			u.set(e, t + 1);
			const r = c.get(e)?.[t];
			r && ua(f, r);
		}
		const d = new Set(l.map(ba)), p = s.filter((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && n.has(wa(e)) || d.has(ba(e))));
		for (const f of p) {
			const e = s.indexOf(f), t = s.slice(e + 1).find((e) => d.has(ba(e))), r = t ? ga(a).find((e) => ba(e) === ba(t)) ?? null : null;
			a.insertBefore(f.cloneNode(!0), r);
		}
		return t || function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const r = e.attributes.item(t);
				if (r && "http://www.w3.org/2000/xmlns/" !== r.namespaceURI) return !0;
			}
			return !1;
		}(a) || 0 !== ga(a).length ? new b.XMLSerializer().serializeToString(a) : "";
	}
	function xa(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Ea(e, t) {
		return xa(e).filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t);
	}
	function Na(e, t) {
		return Ea(e, t)[0];
	}
	function Sa(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}">${e}</oasis:root>`, "application/xml").documentElement;
		if (r) return r ? xa(r).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && e.localName === t) : void 0;
	}
	function ka(e) {
		return e ? new b.XMLSerializer().serializeToString(e) : "";
	}
	function Ta(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Ia(e) {
		const t = /* @__PURE__ */ new Map();
		let r = 0;
		for (const n of e) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && ("tblPr" === n.localName || "tblGrid" === n.localName ? t.set(n, n.localName) : "tr" === n.localName && (t.set(n, `tr:${r}`), r += 1));
		return t;
	}
	function _a(e, t, r, n, o) {
		if (!r) return void (t && e.removeChild(t));
		const i = Sa(r, n);
		i && (t ? e.replaceChild(i.cloneNode(!0), t) : e.insertBefore(i.cloneNode(!0), o));
	}
	function Ca(e, t) {
		const r = Na(t, "tblPr"), n = Na(t, "tblGrid"), o = Na(t, "tr") ?? null;
		_a(t, r, function(e, t) {
			return ya(Oo(e)?.tableProperties, t, "tblPr", da, Co(e));
		}(e, ka(r)), "tblPr", n ?? o);
		const i = Na(t, "tblGrid");
		_a(t, i, function(e, t) {
			return ya(Oo(e)?.tableGrid, t, "tblGrid", pa, Ao(e));
		}(e, ka(i)), "tblGrid", Na(t, "tr") ?? null);
	}
	function Aa(e, t) {
		const r = Ea(t, "tr");
		r.length === e.rows.length && r.forEach((t, r) => {
			const n = e.rows[r], o = Na(t, "tblPrEx"), i = Na(t, "trPr"), a = Na(t, "tc") ?? null;
			_a(t, o, function(e, t) {
				return ya(Po(e)?.propertyExceptions, t, "tblPrEx", fa, Do(e));
			}(n, ka(o)), "tblPrEx", i ?? a);
			const s = Na(t, "trPr");
			var l;
			_a(t, s, (l = function(e, t) {
				return ya(Po(e)?.rowProperties, t, "trPr", ha, Ro(e));
			}(n, ka(s)), l.replace(/(<w:jc\b[^>]*\bw:val=")(?<value>start|end)("[^>]*\/?>)/g, (e, t, r, n) => `${t}${"start" === r ? "left" : "right"}${n}`)), "trPr", Na(t, "tc") ?? null);
			const c = Ea(t, "tc");
			c.length === n.cells.length && c.forEach((e, t) => {
				const r = n.cells[t], o = Na(e, "tcPr");
				_a(e, o, function(e, t) {
					return ya(function(e) {
						return e.ooxmlSource;
					}(e)?.cellProperties, t, "tcPr", ma, $o(e));
				}(r, ka(o)), "tcPr", Na(e, "p") ?? Na(e, "tbl") ?? null);
			});
		});
	}
	function Ra(e) {
		for (const t of Ea(e, "tr")) for (const e of Ea(t, "tc")) {
			for (const n of Ea(e, "tbl")) Ra(n);
			const t = xa(e), r = t[t.length - 1];
			if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r?.namespaceURI && "tbl" === r.localName) {
				const t = e.ownerDocument;
				t && e.appendChild(t.createElementNS(Ht, "w:p"));
			}
		}
	}
	function Da(e, t) {
		const r = Ji(e, t), n = Sa(r, "tbl");
		return n ? (function(e, t) {
			const r = Oo(e)?.xml;
			if (!r) return;
			const n = Sa(r, "tbl");
			if (!n) return;
			(function(e, t) {
				for (let r = 0; r < e.attributes.length; r += 1) {
					const n = e.attributes.item(r);
					if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
					const o = n.localName ?? n.name;
					(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
				}
			})(n, t);
			const o = xa(n), i = xa(t), a = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName), s = i.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "tr" === e.localName);
			if (a.length !== s.length) return;
			const l = Ia(o), c = new Map([...Ia(i)].map(([e, t]) => [t, e]));
			for (let u = 0; u < o.length; u += 1) {
				const e = o[u];
				if (l.has(e)) continue;
				if (Ta(ka(e))) continue;
				const r = o.slice(u + 1).map((e) => l.get(e)).find((e) => Boolean(e)), n = r ? c.get(r) ?? null : null;
				t.insertBefore(e.cloneNode(!0), n);
			}
		}(e, n), Ca(e, n), Aa(e, n), Ra(n), function(e, t) {
			const r = na(t, "tr");
			if (r.length === e.rows.length) {
				for (let t = 0; t < r.length; t += 1) {
					const n = r[t], o = e.rows[t], i = na(n, "tc");
					i.length === o.cells.length && aa(n, i.map((e, t) => ({
						element: e,
						wrappers: o.cells[t].sdtWrappers ?? []
					})));
				}
				aa(t, r.map((t, r) => ({
					element: t,
					wrappers: e.rows[r].sdtWrappers ?? []
				})));
			}
		}(e, n), new b.XMLSerializer().serializeToString(n).replace(`<w:tbl xmlns:w="${Ht}"`, "<w:tbl")) : r;
	}
	const $a = `xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"`;
	function Pa(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Ma(e, t, r) {
		const n = e.ownerDocument;
		if (!n) return;
		const o = n.createElementNS(Ht, `w:${r}`);
		for (let i = 0; i < t.attributes.length; i += 1) {
			const e = t.attributes.item(i);
			e && (e.namespaceURI ? o.setAttributeNS(e.namespaceURI, e.name, e.value) : o.setAttribute(e.name, e.value));
		}
		for (; t.firstChild;) o.appendChild(t.firstChild);
		e.replaceChild(o, t);
	}
	function Oa(e) {
		const t = function(e) {
			const t = new b.DOMParser().parseFromString(`<oasis:root ${$a}>${e}</oasis:root>`, "application/xml").documentElement;
			if (!t) return;
			const r = Pa(t);
			if (1 !== r.length) return;
			const n = r[0];
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n.namespaceURI && "r" === n.localName ? n : void 0;
		}(e);
		if (!t) return e;
		const r = Pa(t), n = r.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "t" === e.localName);
		if (n.length > 0) {
			for (const e of r) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delText" === e.localName && t.removeChild(e);
			for (const e of n) Ma(t, e, "delText");
		}
		const o = Pa(t), i = o.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "instrText" === e.localName);
		if (i.length > 0) {
			for (const e of o) "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "delInstrText" === e.localName && t.removeChild(e);
			for (const e of i) Ma(t, e, "delInstrText");
		}
		return new b.XMLSerializer().serializeToString(t);
	}
	function Fa(e) {
		return /^\d+$/.test(e) ? e : String(Array.from(e).reduce((e, t) => 31 * e + t.charCodeAt(0) >>> 0, 0));
	}
	function La(e) {
		const t = Number.isFinite(e.date) ? new Date(e.date).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
		return `w:id="${Fa(e.id)}" w:author="${Vt(e.author)}" w:date="${t}"`;
	}
	function Ba(e) {
		if (!e || 0 === e.length) return "";
		const t = e.map((e) => {
			const t = Zt(e.position);
			if (null === t) return "";
			const r = [`w:val="${e.type}"`, `w:pos="${t}"`];
			return e.leader && "none" !== e.leader ? r.push(`w:leader="${e.leader}"`) : "none" === e.leader && r.push("w:leader=\"none\""), `<w:tab ${r.join(" ")}/>`;
		}).filter(Boolean);
		return t.length > 0 ? `<w:tabs>${t.join("")}</w:tabs>` : "";
	}
	function Ua(e) {
		const t = [];
		e.framePrXml && t.push(e.framePrXml), e.suppressLineNumbers && t.push("<w:suppressLineNumbers/>"), e.suppressAutoHyphens && t.push("<w:suppressAutoHyphens/>"), e.bidi && t.push("<w:bidi/>"), !1 === e.kinsoku && t.push("<w:kinsoku w:val=\"0\"/>"), !1 === e.wordWrap && t.push("<w:wordWrap w:val=\"0\"/>"), !1 === e.overflowPunct && t.push("<w:overflowPunct w:val=\"0\"/>"), e.topLinePunct && t.push("<w:topLinePunct/>"), !1 === e.autoSpaceDE && t.push("<w:autoSpaceDE w:val=\"0\"/>"), !1 === e.autoSpaceDN && t.push("<w:autoSpaceDN w:val=\"0\"/>"), !1 === e.adjustRightInd && t.push("<w:adjustRightInd w:val=\"0\"/>"), e.textAlignment && t.push(`<w:textAlignment w:val="${e.textAlignment}"/>`), e.textboxTightWrap && t.push(`<w:textboxTightWrap w:val="${e.textboxTightWrap}"/>`), null != e.divId && t.push(`<w:divId w:val="${e.divId}"/>`);
		const r = (n = e.conditionalStyle) ? `<w:cnfStyle w:val="${Nr.map(([, e]) => n[e] ? "1" : "0").join("")}"/>` : "";
		var n;
		return r && t.push(r), t;
	}
	function za(e) {
		const { propertyRevision: t, styleId: r, ...n } = e.previous, o = ja(n), i = o ? o.slice(7, -8) : "", a = r ? `<w:pStyle w:val="${Vt(r)}"/>` : "";
		return `<w:pPrChange ${La(e)}><w:pPr>${a}${i}</w:pPr></w:pPrChange>`;
	}
	function Ha(e) {
		return "justify" === e ? "both" : String(e);
	}
	function ja(e) {
		const t = [];
		if (e.align && t.push(`<w:jc w:val="${Ha(e.align)}"/>`), void 0 !== e.spacingBefore || void 0 !== e.spacingAfter || void 0 !== e.lineHeight) {
			const r = [], n = Xt(e.spacingBefore), o = Xt(e.spacingAfter), i = void 0 !== e.lineHeight && null !== e.lineHeight && Number.isFinite(e.lineHeight), a = "exact" === e.lineRule || "atLeast" === e.lineRule, s = i ? a ? Gt(e.lineHeight, 0) : Math.round(240 * e.lineHeight) : null;
			null !== n && r.push(`w:before="${n}"`), null !== o && r.push(`w:after="${o}"`), null !== s && r.push(`w:line="${s}"`), null !== s && a && r.push(`w:lineRule="${e.lineRule}"`), r.length > 0 && t.push(`<w:spacing ${r.join(" ")}/>`);
		}
		if (void 0 !== e.indentLeft || void 0 !== e.indentRight || void 0 !== e.indentFirstLine || void 0 !== e.indentHanging) {
			const r = [], n = Xt(e.indentLeft), o = Xt(e.indentRight), i = Xt(e.indentFirstLine), a = Xt(e.indentHanging);
			null !== n && r.push(`w:left="${n}"`), null !== o && r.push(`w:right="${o}"`), null !== i && r.push(`w:firstLine="${i}"`), null !== a && r.push(`w:hanging="${a}"`), r.length > 0 && t.push(`<w:ind ${r.join(" ")}/>`);
		}
		const r = Ba(e.tabs);
		r && t.push(r), e.pageBreakBefore && t.push("<w:pageBreakBefore/>"), e.keepWithNext && t.push("<w:keepNext/>"), e.keepLinesTogether && t.push("<w:keepLines/>"), !1 === e.widowControl && t.push("<w:widowControl w:val=\"0\"/>"), e.contextualSpacing && t.push("<w:contextualSpacing/>"), e.mirrorIndents && t.push("<w:mirrorIndents/>");
		const n = Mi(e);
		return n && t.push(n), e.shading && t.push(Qt(e.shading)), e.textDirection && t.push(`<w:textDirection w:val="${e.textDirection}"/>`), null != e.outlineLevel && t.push(`<w:outlineLvl w:val="${e.outlineLevel}"/>`), t.push(...Ua(e)), e.propertyRevision && t.push(za(e.propertyRevision)), t.length > 0 ? `<w:pPr>${$i(t, Ii)}</w:pPr>` : "";
	}
	function qa(e, t, r, n) {
		const o = [], i = function(e, t) {
			const r = $e(e.style, t);
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
		if (e.style?.styleId && o.push(`<w:pStyle w:val="${Vt(e.style.styleId)}"/>`), a && o.push(`<w:jc w:val="${Ha(a)}"/>`), void 0 !== i.spacingBefore || void 0 !== i.spacingAfter || void 0 !== i.lineHeight) {
			const e = [], t = Xt(i.spacingBefore), r = Xt(i.spacingAfter), n = void 0 !== i.lineHeight && null !== i.lineHeight && Number.isFinite(i.lineHeight), a = "exact" === i.lineRule || "atLeast" === i.lineRule, s = n ? a ? Gt(i.lineHeight, 0) : Math.round(240 * i.lineHeight) : null;
			null !== t && e.push(`w:before="${t}"`), null !== r && e.push(`w:after="${r}"`), null !== s && e.push(`w:line="${s}"`), null !== s && a && e.push(`w:lineRule="${i.lineRule}"`), e.length > 0 && o.push(`<w:spacing ${e.join(" ")}/>`);
		}
		if (void 0 !== i.indentLeft || void 0 !== i.indentRight || void 0 !== i.indentFirstLine || void 0 !== i.indentHanging) {
			const e = [], t = Xt(i.indentLeft), r = Xt(i.indentRight), n = Xt(i.indentFirstLine), a = Xt(i.indentHanging);
			null !== t && e.push(`w:left="${t}"`), null !== r && e.push(`w:right="${r}"`), null !== n && e.push(`w:firstLine="${n}"`), null !== a && e.push(`w:hanging="${a}"`), e.length > 0 && o.push(`<w:ind ${e.join(" ")}/>`);
		}
		const s = Ba(i.tabs);
		s && o.push(s), i.pageBreakBefore && o.push("<w:pageBreakBefore/>"), i.keepWithNext && o.push("<w:keepNext/>"), i.keepLinesTogether && o.push("<w:keepLines/>"), !1 === i.widowControl && o.push("<w:widowControl w:val=\"0\"/>"), i.contextualSpacing && o.push("<w:contextualSpacing/>"), i.mirrorIndents && o.push("<w:mirrorIndents/>");
		const l = Mi(i);
		l && o.push(l), i.shading && o.push(Qt(i.shading)), i.textDirection && o.push(`<w:textDirection w:val="${i.textDirection}"/>`), null != i.outlineLevel && o.push(`<w:outlineLvl w:val="${i.outlineLevel}"/>`), o.push(...Ua(i));
		const c = t.get(e.id), u = e.numberingRevision ? `<w:numberingChange ${La(e.numberingRevision)}${void 0 !== e.numberingRevision.original ? ` w:original="${Vt(e.numberingRevision.original)}"` : ""}/>` : "";
		if (c || u) {
			const e = c ? `<w:ilvl w:val="${c.level}"/><w:numId w:val="${c.numId}"/>` : "";
			o.push(`<w:numPr>${e}${u}</w:numPr>`);
		}
		return e.style?.propertyRevision && o.push(za(e.style.propertyRevision)), o.length > 0 ? `<w:pPr>${$i(o, Ii)}</w:pPr>` : "";
	}
	function Wa(e) {
		let t = e.trim();
		for (let r = 0; r < 3; r++) {
			const e = /^(?:"([^"]*)"|'([^']*)'|([^,]*))/.exec(t);
			if (!e) break;
			const r = (e[1] ?? e[2] ?? e[3] ?? "").trim();
			if (!/,\s*(?:sans-serif|serif|monospace|system-ui)\s*$/i.test(r)) return {
				"sans-serif": "Calibri",
				serif: "Times New Roman",
				monospace: "Courier New",
				"system-ui": "Calibri"
			}[r.toLowerCase()] ?? (r && r.length <= 31 ? r : "Calibri");
			t = r;
		}
		return "Calibri";
	}
	const Va = {
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
	}, Ga = {
		ffff00: "yellow",
		fef08a: "yellow",
		ff0000: "red",
		"00ff00": "green",
		"0000ff": "blue",
		"00ffff": "cyan",
		ff00ff: "magenta",
		"000000": "black",
		ffffff: "white"
	}, Xa = "http://schemas.openxmlformats.org/markup-compatibility/2006";
	function Za(e) {
		return `<w14:solidFill><w14:srgbClr w14:val="${Yt(e)}"/></w14:solidFill>`;
	}
	function Ya(e) {
		return "solid" === e.type ? Za(e.color) : `<w14:gradFill><w14:gsLst>${e.stops.map((e) => {
			const t = Yt(e.color);
			return `<w14:gs w14:pos="${Math.round(e.position * ie)}"><w14:srgbClr w14:val="${t}">${void 0 !== e.alpha ? `<w14:alpha w14:val="${Math.round(e.alpha * ie)}"/>` : ""}</w14:srgbClr></w14:gs>`;
		}).join("")}</w14:gsLst><w14:lin w14:ang="${Math.round((e.angle ?? 0) * ae)}" w14:scaled="0"/></w14:gradFill>`;
	}
	function Qa(e, t) {
		return `<w14:srgbClr w14:val="${Yt(e)}">${void 0 !== t ? `<w14:alpha w14:val="${Math.round(t * ie)}"/>` : ""}</w14:srgbClr>`;
	}
	function Ka(e) {
		return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14">${e}</mc:Choice><mc:Fallback/></mc:AlternateContent>`;
	}
	function Ja(e) {
		return null != e && Number.isFinite(e) ? Math.round(20 * e) : null;
	}
	const es = function(e) {
		if (!e) return null;
		const t = Bt(e);
		return Lt.test(t) ? [
			Number.parseInt(t.slice(0, 2), 16),
			Number.parseInt(t.slice(2, 4), 16),
			Number.parseInt(t.slice(4, 6), 16)
		] : null;
	};
	function ts(e) {
		if (!e) return "";
		const t = [];
		e.styleId && t.push(`<w:rStyle w:val="${Vt(e.styleId)}"/>`);
		const r = (e, ...r) => {
			if (null != e) for (const n of r) t.push(e ? `<w:${n}/>` : `<w:${n} w:val="0"/>`);
		};
		if (r(e.bold, "b", "bCs"), r(e.italic, "i", "iCs"), e.underline) {
			const r = e.underlineStyle ?? "single", n = e.underlineColor ? ` w:color="${Yt(e.underlineColor, "auto")}"` : "";
			t.push(`<w:u w:val="${Vt(r)}"${n}/>`);
		} else !1 === e.underline && t.push("<w:u w:val=\"none\"/>");
		if (r(e.strike, "strike"), r(e.doubleStrike, "dstrike"), r(e.outline, "outline"), r(e.shadow, "shadow"), r(e.emboss, "emboss"), r(e.imprint, "imprint"), r(e.smallCaps, "smallCaps"), r(e.allCaps, "caps"), r(e.hidden, "vanish"), r(e.noProof, "noProof"), r(e.webHidden, "webHidden"), r(e.specVanish, "specVanish"), !1 === e.snapToGrid && t.push("<w:snapToGrid w:val=\"0\"/>"), e.textEffect && t.push(`<w:effect w:val="${Vt(e.textEffect)}"/>`), e.textBorder && t.push(`<w:bdr ${Pi(e.textBorder)}`), void 0 !== e.characterScale && null !== e.characterScale && Number.isFinite(e.characterScale) && t.push(`<w:w w:val="${Math.max(1, Math.round(e.characterScale))}"/>`), void 0 !== e.characterSpacing && null !== e.characterSpacing) {
			const r = Ja(e.characterSpacing);
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
		if (a && t.push(`<w14:stylisticSets w14:val="${a}"/>`), void 0 !== e.contextualAlternates && t.push(`<w14:cntxtAlts w14:val="${e.contextualAlternates ? 1 : 0}"/>`), e.superscript ? t.push("<w:vertAlign w:val=\"superscript\"/>") : e.subscript ? t.push("<w:vertAlign w:val=\"subscript\"/>") : !1 !== e.superscript && !1 !== e.subscript || t.push("<w:vertAlign w:val=\"baseline\"/>"), e.fontFamily && t.push(`<w:rFonts w:ascii="${Vt(Wa(e.fontFamily))}" w:hAnsi="${Vt(Wa(e.fontFamily))}" w:cs="${Vt(Wa(e.fontFamily))}"/>`), void 0 !== e.fontSize && null !== e.fontSize) {
			const r = function(e) {
				return null != e && Number.isFinite(e) ? Math.round(e / 96 * 72 * 2) : null;
			}(e.fontSize);
			null !== r && t.push(`<w:sz w:val="${r}"/>`, `<w:szCs w:val="${r}"/>`);
		}
		if (e.textFill) {
			const r = "solid" === e.textFill.type ? e.textFill.color : e.color;
			t.push(function(e, t) {
				const r = Ya(e), n = Yt(t ?? "000000");
				return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14"><w14:textFill>${r}</w14:textFill></mc:Choice><mc:Fallback><w:color w:val="${n}"/></mc:Fallback></mc:AlternateContent>`;
			}(e.textFill, r ?? null));
		} else e.color && t.push(`<w:color w:val="${Yt(e.color, "auto")}"/>`);
		if (e.textOutline && t.push(function(e) {
			const t = Math.round(Math.max(0, e.widthPt) * ne), r = e.fill ? Ya(e.fill) : e.color ? Za(e.color) : "";
			return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14"><w14:textOutline w14:w="${t}" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">` + r + "</w14:textOutline></mc:Choice><mc:Fallback><w:outline/></mc:Fallback></mc:AlternateContent>";
		}(e.textOutline)), e.textShadow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * ne), r = Math.round(Math.max(0, e.distPt) * ne), n = Math.round(e.dirDeg * ae), o = Qa(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14"><w14:shadow w14:blurRad="${t}" w14:dist="${r}" w14:dir="${n}" w14:sx="100000" w14:sy="100000" w14:kx="0" w14:ky="0" w14:algn="ctr">` + o + "</w14:shadow></mc:Choice><mc:Fallback><w:shadow/></mc:Fallback></mc:AlternateContent>";
		}(e.textShadow)), e.glow && t.push(function(e) {
			const t = Math.round(Math.max(0, e.radiusPt) * ne), r = Qa(e.color, e.alpha);
			return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14"><w14:glow w14:rad="${t}">${r}</w14:glow></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.glow)), e.reflection && t.push(function(e) {
			const t = Math.round(Math.max(0, e.blurPt) * ne), r = Math.round(e.startAlpha * ie), n = Math.round(e.startPos * ie), o = Math.round(e.endAlpha * ie), i = Math.round(e.endPos * ie), a = Math.round(Math.max(0, e.distPt) * ne);
			return `<mc:AlternateContent xmlns:mc="${Xa}"><mc:Choice Requires="w14"><w14:reflection w14:blurRad="${t}" w14:stA="${r}" w14:stPos="${n}" w14:endA="${o}" w14:endPos="${i}" w14:dist="${a}" w14:dir="5400000" w14:fadeDir="5400000" w14:sx="100000" w14:sy="-100000" w14:kx="0" w14:ky="0" w14:algn="bl"/></mc:Choice><mc:Fallback/></mc:AlternateContent>`;
		}(e.reflection)), e.scene3dXml && t.push(Ka(e.scene3dXml)), e.props3dXml && t.push(Ka(e.props3dXml)), e.highlight && t.push(`<w:highlight w:val="${Vt(function(e) {
			if (e in Va) return e;
			const t = (zt(e) ?? e).trim().replace(/^#/, "").toLowerCase(), r = Ga[t];
			if (r) return r;
			const n = es(t);
			if (!n) return "yellow";
			let o = "yellow", i = Number.POSITIVE_INFINITY;
			for (const [a, s] of Object.entries(Va)) {
				const e = (s[0] - n[0]) ** 2 + (s[1] - n[1]) ** 2 + (s[2] - n[2]) ** 2;
				e < i && (i = e, o = a);
			}
			return o;
		}(e.highlight))}"/>`), e.shading && t.push(Qt(e.shading)), void 0 !== e.fitText && null !== e.fitText && Number.isFinite(e.fitText)) {
			const r = Ja(e.fitText);
			null !== r && r > 0 && t.push(`<w:fitText w:val="${r}"/>`);
		}
		if (r(e.rtl, "rtl"), r(e.complexScript, "cs"), e.emphasisMark && t.push(`<w:em w:val="${Vt(e.emphasisMark)}"/>`), e.language) {
			const r = [];
			e.language.value && r.push(`w:val="${Vt(e.language.value)}"`), e.language.eastAsia && r.push(`w:eastAsia="${Vt(e.language.eastAsia)}"`), e.language.bidi && r.push(`w:bidi="${Vt(e.language.bidi)}"`), r.length > 0 && t.push(`<w:lang ${r.join(" ")}/>`);
		}
		return e.propertyRevision && t.push(function(e) {
			const { propertyRevision: t, styleId: r, ...n } = e.previous, o = ts(n), i = o ? o.slice(7, -8) : "", a = r ? `<w:rStyle w:val="${Vt(r)}"/>` : "";
			return `<w:rPrChange ${La(e)}><w:rPr>${a}${i}</w:rPr></w:rPrChange>`;
		}(e.propertyRevision)), t.length > 0 ? `<w:rPr>${$i(t, _i)}</w:rPr>` : "";
	}
	function rs(e) {
		return 0 === e.length ? "" : `<w:t${t = e, /^\s|\s$/.test(t) || t.includes("  ") ? " xml:space=\"preserve\"" : ""}>${Vt(e)}</w:t>`;
		var t;
	}
	function ns(e) {
		if (0 === e.length) return "<w:t></w:t>";
		let t = "", r = "";
		for (const n of e) "\n" !== n ? "\v" !== n ? "	" !== n ? "‑" !== n ? "­" !== n ? r += n : (t += rs(r), r = "", t += "<w:softHyphen/>") : (t += rs(r), r = "", t += "<w:noBreakHyphen/>") : (t += rs(r), r = "", t += "<w:tab/>") : (t += rs(r), r = "", t += "<w:br w:type=\"column\"/>") : (t += rs(r), r = "", t += "<w:br/>");
		return t += rs(r), t || "<w:t></w:t>";
	}
	function os(e, t) {
		return e ?? t ? "1" : "0";
	}
	function is(e, t, r) {
		const n = Vt(t?.relativeFrom ?? r);
		return t?.align ? `<wp:${e} relativeFrom="${n}"><wp:align>${Vt(t.align)}</wp:align></wp:${e}>` : `<wp:${e} relativeFrom="${n}"><wp:posOffset>${t?.offset ?? 0}</wp:posOffset></wp:${e}>`;
	}
	function as(e) {
		if (!e || e.length < 3) return "";
		const t = (e) => Math.round(21600 * Math.min(1, Math.max(0, e))), r = (e, r) => `<wp:${r} x="${t(e.x)}" y="${t(e.y)}"/>`, n = e[0];
		return `<wp:wrapPolygon edited="0">${[
			r(n, "start"),
			...e.slice(1).map((e) => r(e, "lineTo")),
			r(n, "lineTo")
		].join("")}</wp:wrapPolygon>`;
	}
	function ss(e) {
		const { cx: t, cy: r, floating: n, docPrId: o, docPrName: i, altAttr: a, graphicXml: s } = e, l = Vt(i);
		if (!n) return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${t}" cy="${r}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:inline></w:drawing>`;
		const c = n.distT ?? 0, u = n.distB ?? 0, d = n.distL ?? 0, p = n.distR ?? 0, f = is("positionH", n.positionH, "column"), h = is("positionV", n.positionV, "paragraph"), m = function(e, t, r) {
			const n = t && "bothSides" !== t ? ` wrapText="${t}"` : "";
			switch (e) {
				case "square": return `<wp:wrapSquare${n}/>`;
				case "tight": {
					const e = as(r);
					return e ? `<wp:wrapTight${n}>${e}</wp:wrapTight>` : `<wp:wrapTight${n}/>`;
				}
				case "through": {
					const e = as(r);
					return e ? `<wp:wrapThrough${n}>${e}</wp:wrapThrough>` : `<wp:wrapThrough${n}/>`;
				}
				case "topAndBottom": return "<wp:wrapTopAndBottom/>";
				default: return "<wp:wrapNone/>";
			}
		}(n.wrap, n.wrapText, e.wrapPolygon);
		return `<w:drawing><wp:anchor distT="${c}" distB="${u}" distL="${d}" distR="${p}" simplePos="${os(n.simplePos, !1)}" relativeHeight="${n.relativeHeight ?? 0}" behindDoc="${os(n.behindDoc, !1)}" locked="${os(n.locked, !1)}" layoutInCell="${os(n.layoutInCell, !0)}" allowOverlap="${os(n.allowOverlap, !0)}"><wp:simplePos x="0" y="0"/>${f}${h}<wp:extent cx="${t}" cy="${r}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${m}<wp:docPr id="${o}" name="${l}"${a}/>${s}</wp:anchor></w:drawing>`;
	}
	function ls(e, t, r, n) {
		const o = r.images.find((e) => e.rId === t);
		if (!o) return null;
		const i = (parseInt(t.replace(/\D+/g, ""), 10) || 0) + 1, a = void 0 !== o.alt ? ` descr="${Vt(o.alt)}" title="${Vt(o.alt)}"` : "", s = function(e) {
			let t = "";
			if (e.rotation) {
				const r = Math.round(e.rotation * ae);
				0 !== r && (t += ` rot="${r}"`);
			}
			return e.flipH && (t += " flipH=\"1\""), e.flipV && (t += " flipV=\"1\""), t;
		}(o), l = function(e) {
			if (!e) return "";
			const t = (e) => e ? Math.round(e * ie) : 0, r = t(e.left), n = t(e.top), o = t(e.right), i = t(e.bottom);
			return 0 === r && 0 === n && 0 === o && 0 === i ? "" : `<a:srcRect l="${r}" t="${n}" r="${o}" b="${i}"/>`;
		}(o.crop), c = (u = o.border) ? `<a:ln${void 0 !== u.widthPt ? ` w="${Math.round(u.widthPt * ne)}"` : ""}><a:solidFill><a:srgbClr val="${Vt(u.color.replace(/^#/, ""))}"/></a:solidFill>${u.dash ? `<a:prstDash val="${u.dash}"/>` : ""}</a:ln>` : "";
		var u;
		const d = "tile" === o.fillMode ? "<a:tile/>" : "<a:stretch><a:fillRect/></a:stretch>", p = "linked" === o.kind ? `r:link="${t}"` : `r:embed="${t}"`, f = void 0 !== o.transparency && o.transparency > 0 ? `<a:alphaModFix amt="${Math.round((1 - Math.max(0, Math.min(1, o.transparency))) * ie)}"/>` : "", h = function(e) {
			if (!e) return "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>";
			if (e.rawXml && !e.adjustments) return e.rawXml;
			const t = Object.entries(e.adjustments ?? {}).map(([e, t]) => `<a:gd name="${Vt(e)}" fmla="val ${Number.isFinite(t) ? t : 0}"/>`).join(""), r = t ? `<a:avLst>${t}</a:avLst>` : "<a:avLst/>";
			return `<a:prstGeom prst="${Vt(e.preset)}">${r}</a:prstGeom>`;
		}(o.cropShape);
		return `<w:r>${n}${function(e, t, r, n) {
			return ss({
				cx: e.cx,
				cy: e.cy,
				floating: e.floating,
				docPrId: t,
				docPrName: "Picture",
				altAttr: r,
				graphicXml: n,
				wrapPolygon: e.wrapPolygon
			});
		}(o, i, a, `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${a}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip ${p} xmlns:r="${qt}">${f}</a:blip>${l}${d}</pic:blipFill><pic:spPr><a:xfrm${s}><a:off x="0" y="0"/><a:ext cx="${o.cx}" cy="${o.cy}"/></a:xfrm>${h}${c}</pic:spPr></pic:pic></a:graphicData></a:graphic>`)}</w:r>`;
	}
	function cs(e, t, r, n, o, i) {
		const a = Math.round(t.width * re), s = Math.round(t.height * re), l = r.textBoxDocPrIds.get(e.id) ?? 1, c = t.name ?? "Text Box", u = void 0 !== t.alt ? ` descr="${Vt(t.alt)}" title="${Vt(t.alt)}"` : "", d = function(e, t, r, n, o, i) {
			const a = e.shape, s = Vt(a?.preset ?? "rect"), l = e.rotation ? Math.round(e.rotation * ae) : 0, c = 0 !== l ? ` rot="${l}"` : "", u = a?.fill ? `<a:solidFill><a:srgbClr val="${Vt(a.fill.replace(/^#/, ""))}"/></a:solidFill>` : "";
			let d = "";
			(a?.borderColor || void 0 !== a?.borderWidthPt) && (d = `<a:ln${void 0 !== a?.borderWidthPt ? ` w="${Math.round(a.borderWidthPt * ne)}"` : ""}>${a?.borderColor ? `<a:solidFill><a:srgbClr val="${Vt(a.borderColor.replace(/^#/, ""))}"/></a:solidFill>` : ""}<a:miter lim="800000"/></a:ln>`);
			const p = e.body, f = ["rot=\"0\"", `vert="${Vt(p?.vert ?? "horz")}"`];
			f.push(`wrap="${Vt(p?.wrap ?? "square")}"`), void 0 !== p?.paddingLeft && f.push(`lIns="${Math.round(p.paddingLeft * re)}"`), void 0 !== p?.paddingTop && f.push(`tIns="${Math.round(p.paddingTop * re)}"`), void 0 !== p?.paddingRight && f.push(`rIns="${Math.round(p.paddingRight * re)}"`), void 0 !== p?.paddingBottom && f.push(`bIns="${Math.round(p.paddingBottom * re)}"`), f.push(`anchor="${Vt(p?.anchor ?? "t")}"`), f.push("anchorCtr=\"0\"");
			const h = p?.autoFit ? "<a:spAutoFit/>" : "", m = e.blocks.length > 0, g = m ? i(e.blocks, n, o) : "";
			return "<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\"><wps:wsp>" + (m ? "<wps:cNvSpPr txBox=\"1\"><a:spLocks noChangeArrowheads=\"1\"/></wps:cNvSpPr>" : "<wps:cNvSpPr/>") + `<wps:spPr bwMode="auto"><a:xfrm${c}><a:off x="0" y="0"/><a:ext cx="${t}" cy="${r}"/></a:xfrm><a:prstGeom prst="${s}"><a:avLst/></a:prstGeom>` + u + d + "</wps:spPr>" + (m ? `<wps:txbx><w:txbxContent>${g}</w:txbxContent></wps:txbx>` : "") + `<wps:bodyPr ${f.join(" ")}>${h}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
		}(t, a, s, r, n, i);
		return `<w:r>${o}${ss({
			cx: a,
			cy: s,
			floating: t.floating,
			docPrId: l,
			docPrName: c,
			altAttr: u,
			graphicXml: d
		})}</w:r>`;
	}
	const us = {
		footnote: "FootnoteReference",
		endnote: "EndnoteReference"
	};
	function ds(e) {
		return `<w:r><w:rPr><w:rStyle w:val="${us[e]}"/><w:vertAlign w:val="superscript"/></w:rPr><w:${e}Ref/></w:r>`;
	}
	function ps(e, t, r, n) {
		if (!t) return null;
		const o = ("footnote" === e ? n.footnoteIdMap : n.endnoteIdMap)?.get(t.noteId);
		if (void 0 === o) return null;
		const i = {
			...r ?? {},
			styleId: us[e],
			superscript: !0
		}, a = t.customMark ? " w:customMarkFollows=\"1\"" : "", s = t.customMark ? `<w:t xml:space="preserve">${Vt(t.customMark)}</w:t>` : "";
		return `<w:r>${ts(i)}<w:${e}Reference${a} w:id="${o}"/>${s}</w:r>`;
	}
	function fs(e, t) {
		return void 0 === t ? "" : ` m:${e}="${Vt(String(t))}"`;
	}
	function hs(e) {
		return e.map(ms).join("");
	}
	function ms(e) {
		switch (e.kind) {
			case "text": return function(e) {
				const t = e.style;
				return `<m:r>${t ? `<m:rPr>${t.bold ? "<m:b/>" : ""}${t.italic ? "<m:i/>" : ""}${t.normalText ? "<m:nor/>" : ""}${t.script ? `<m:sty m:val="${Vt(t.script)}"/>` : ""}</m:rPr>` : ""}<m:t xml:space="preserve">${Vt(e.value)}</m:t></m:r>`;
			}(e);
			case "fraction": return `<m:f>${!1 === e.bar ? "<m:fPr><m:type m:val=\"noBar\"/></m:fPr>" : ""}<m:num>${hs(e.numerator)}</m:num><m:den>${hs(e.denominator)}</m:den></m:f>`;
			case "radical": return e.degree ? `<m:rad><m:deg>${hs(e.degree)}</m:deg><m:e>${hs(e.radicand)}</m:e></m:rad>` : `<m:rad><m:e>${hs(e.radicand)}</m:e></m:rad>`;
			case "script": {
				const t = e.subscript && e.superscript ? "sSubSup" : e.subscript ? "sSub" : "sSup";
				return `<m:${t}><m:e>${hs(e.base)}</m:e>${e.subscript ? `<m:sub>${hs(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${hs(e.superscript)}</m:sup>` : ""}</m:${t}>`;
			}
			case "delimiter": return `<m:d><m:dPr>${fs("begChr", e.begin)}${fs("endChr", e.end)}${fs("sepChr", e.separator)}${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:dPr>${e.children.map((e) => `<m:e>${hs(e)}</m:e>`).join("")}</m:d>`;
			case "accent": return `<m:acc><m:accPr><m:chr${fs("val", e.accent)}/></m:accPr><m:e>${hs(e.children)}</m:e></m:acc>`;
			case "nary": return `<m:nary><m:naryPr><m:chr${fs("val", e.operator)}/>${!1 === e.grow ? "<m:grow m:val=\"0\"/>" : ""}</m:naryPr>${e.subscript ? `<m:sub>${hs(e.subscript)}</m:sub>` : ""}${e.superscript ? `<m:sup>${hs(e.superscript)}</m:sup>` : ""}<m:e>${hs(e.children)}</m:e></m:nary>`;
			case "limit": return "low" === e.operator ? `<m:limLow><m:e>${hs(e.base)}</m:e><m:lim>${hs(e.limit)}</m:lim></m:limLow>` : `<m:limUpp><m:e>${hs(e.base)}</m:e><m:lim>${hs(e.limit)}</m:lim></m:limUpp>`;
			case "matrix": return `<m:m>${e.rows.map((e) => `<m:mr>${e.map((e) => `<m:e>${hs(e)}</m:e>`).join("")}</m:mr>`).join("")}</m:m>`;
			case "box": return `<m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}><m:e>${hs(e.children)}</m:e></m:${e.hidden ? "phant" : e.border ? "borderBox" : "box"}>`;
			case "group": return hs(e.children);
			case "raw": return e.xml;
		}
	}
	const gs = "http://schemas.openxmlformats.org/markup-compatibility/2006", ws = /* @__PURE__ */ new Set([
		"t",
		"tab",
		"br",
		"cr",
		"noBreakHyphen",
		"softHyphen"
	]), bs = /* @__PURE__ */ new Set([
		...ws,
		"drawing",
		"pict",
		"sym",
		"fldChar",
		"instrText",
		"footnoteReference",
		"endnoteReference",
		"separator",
		"continuationSeparator"
	]), vs = /* @__PURE__ */ new Set([
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
	]), ys = /* @__PURE__ */ new Set([
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
	function xs(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Es(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Ns(e) {
		return e.localName ?? e.tagName;
	}
	function Ss(e, t, r) {
		return Es(e).find((e) => e.namespaceURI === t && Ns(e) === r);
	}
	function ks(e) {
		return `${e.namespaceURI ?? ""}\0${Ns(e)}`;
	}
	function Ts(e) {
		const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
		return t && "r" === Ns(t) ? t : void 0;
	}
	function Is(e) {
		const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:r="${qt}" xmlns:mc="${gs}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!t) return;
		const r = Es(t);
		return 1 === r.length && "r" === Ns(r[0]) ? r[0] : void 0;
	}
	function _s(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function Cs(e) {
		for (let t = 0; t < e.attributes.length; t += 1) {
			const r = e.attributes[t];
			if (r && !_s(r) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== r.namespaceURI) return !0;
		}
		return !1;
	}
	function As(e) {
		const t = Ns(e);
		return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI ? vs.has(t) : "http://schemas.microsoft.com/office/word/2010/wordml" === e.namespaceURI ? ys.has(t) : e.namespaceURI === gs && "AlternateContent" === t;
	}
	function Rs(e, t) {
		const r = Ss(e, Ht, "rPr");
		if (!r) return;
		const n = Es(r), o = Ss(t, Ht, "rPr"), i = o ? Es(o) : [], a = new Set(i.map(ks)), s = n.filter((e) => !As(e) && !a.has(ks(e)));
		if (0 === s.length) return;
		const l = function(e) {
			const t = Ss(e, Ht, "rPr");
			if (t) return t;
			const r = e.ownerDocument.createElementNS(Ht, "w:rPr");
			return e.insertBefore(r, e.firstChild), r;
		}(t);
		for (const c of s) {
			const e = n.indexOf(c), t = n.slice(e + 1).find((e) => a.has(ks(e))), r = t ? Es(l).find((e) => ks(e) === ks(t)) ?? null : null;
			l.insertBefore(c.cloneNode(!0), r);
		}
	}
	function Ds(e) {
		const t = Ns(e);
		return e.namespaceURI === gs && "AlternateContent" === t ? function(e) {
			const t = (e) => Es(e).some((e) => {
				const r = Ns(e);
				return !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !bs.has(r)) || t(e);
			});
			return t(e);
		}(e) : "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && ("rPr" === t || bs.has(t));
	}
	function $s(e) {
		const t = So(e);
		if (t && !xs(t.xml) && (r = t.xml, !fo.test(r))) {
			var r;
			if (t.semanticSignature === xo(e)) return t.xml;
			if (t.structureSignature === Eo(e)) return function(e, t) {
				if ("text" !== e.kind) return;
				const r = Ts(t);
				if (!r) return;
				const n = Es(r), o = n.filter((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && ws.has(Ns(e))), i = o[0] ?? n.find((e) => !("http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && "rPr" === Ns(e))) ?? null, a = Is(`<w:r>${ns(e.text)}</w:r>`);
				if (!a) return;
				const s = Es(a);
				for (const l of s) r.insertBefore(l.cloneNode(!0), i);
				for (const l of o) r.removeChild(l);
				return new b.XMLSerializer().serializeToString(r);
			}(e, t.xml);
		}
	}
	function Ps(e, t) {
		const r = So(e);
		if (!r || xs(r.xml)) return t;
		const n = Ts(r.xml);
		if (!n || !function(e) {
			if (Cs(e)) return !0;
			const t = Ss(e, Ht, "rPr");
			return !(!t || !Cs(t) && !Es(t).some((e) => !As(e))) || Es(e).some((e) => !Ds(e));
		}(n)) return t;
		const o = Is(t);
		return o ? (function(e, t) {
			for (let r = 0; r < e.attributes.length; r += 1) {
				const n = e.attributes[r];
				if (!n || "http://schemas.openxmlformats.org/officeDocument/2006/relationships" === n.namespaceURI) continue;
				const o = n.localName ?? n.name;
				(n.namespaceURI ? t.hasAttributeNS(n.namespaceURI, o) : t.hasAttribute(n.name)) || (n.namespaceURI ? t.setAttributeNS(n.namespaceURI, n.name, n.value) : t.setAttribute(n.name, n.value));
			}
		}(n, o), Rs(n, o), function(e, t) {
			const r = Es(e), n = Es(t), o = new Set(n.map(ks)), i = r.filter((e) => !Ds(e) && !o.has(ks(e)));
			for (const a of i) {
				const e = r.indexOf(a), n = r.slice(e + 1).find((e) => Ds(e)), o = n ? Es(t).find((e) => ks(e) === ks(n)) ?? null : null;
				t.insertBefore(a.cloneNode(!0), o);
			}
		}(n, o), new b.XMLSerializer().serializeToString(o)) : t;
	}
	function Ms(e, t, r, n, o) {
		if (e.revisionRangeMarker) return function(e) {
			const t = `move${"from" === e.move ? "From" : "To"}Range${"start" === e.edge ? "Start" : "End"}`, r = [`w:id="${Fa(e.id)}"`];
			return void 0 !== e.displacedByCustomXml && r.push(`w:displacedByCustomXml="${Vt(e.displacedByCustomXml)}"`), "start" === e.edge && (void 0 !== e.name && r.push(`w:name="${Vt(e.name)}"`), void 0 !== e.author && r.push(`w:author="${Vt(e.author)}"`), void 0 !== e.date && Number.isFinite(e.date) && r.push(`w:date="${new Date(e.date).toISOString()}"`), void 0 !== e.columnFirst && r.push(`w:colFirst="${Math.trunc(e.columnFirst)}"`), void 0 !== e.columnLast && r.push(`w:colLast="${Math.trunc(e.columnLast)}"`)), `<w:${t} ${r.join(" ")}/>`;
		}(e.revisionRangeMarker);
		if (e.__isFootnoteRefMarker) return ds("footnote");
		if (e.__isEndnoteRefMarker) return ds("endnote");
		if ("opaque" === e.kind) {
			const r = t.authorizedOpaqueFragments?.get(e.opaque.fragmentXml);
			if (!r || "￼" !== e.text || r.signature !== e.opaque.signature || r.kind !== e.opaque.objectKind || JSON.stringify(r.relationshipIds) !== JSON.stringify(e.opaque.relationshipIds)) throw new Error("Opaque DOCX objects require source-backed export with an unchanged, authorized source fragment.");
			return `<w:r>${ts(e.styles)}${e.opaque.fragmentXml}</w:r>`;
		}
		const i = $s(e);
		if (i) return i;
		const a = function(e, t, r) {
			const n = De(e.styles, t, r), o = {
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
			}, i = De(e.styles?.styleId ? { styleId: e.styles.styleId } : void 0, t, r);
			for (const a of Object.keys(o)) ("styleId" !== a && e.styles?.styleId && "character" === r?.[e.styles.styleId]?.type && void 0 === e.styles[a] && o[a] === i[a] || !1 === o[a] && !1 !== e.styles?.[a] && !0 !== i[a]) && delete o[a];
			return e.styles?.link && (o.link = e.styles.link), o;
		}(e, r, n), s = () => ts(a), l = () => `<w:r>${s()}${ns(e.text)}</w:r>`;
		return Ps(e, function(e, t) {
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
			footnoteReference: (e) => function(e, t, r) {
				const n = fe(e);
				return ps("footnote", n ? {
					noteId: n.footnoteId,
					customMark: n.customMark
				} : void 0, t, r);
			}(e, a, t) ?? l(),
			endnoteReference: (e) => function(e, t, r) {
				const n = he(e);
				return ps("endnote", n ? {
					noteId: n.endnoteId,
					customMark: n.customMark
				} : void 0, t, r);
			}(e, a, t) ?? l(),
			fieldChar: (e) => function(e, t) {
				const r = (e.fieldLock ? " w:fldLock=\"true\"" : "") + (e.dirty ? " w:dirty=\"true\"" : "");
				return `<w:r>${t}<w:fldChar w:fldCharType="${e.kind}"${r}/></w:r>`;
			}(e.fieldChar, s()),
			fieldInstruction: (e) => {
				return t = e.fieldInstruction, `<w:r>${s()}<w:instrText xml:space="preserve">${Vt(t)}</w:instrText></w:r>`;
				var t;
			},
			field: (e) => function(e, t, r = "1") {
				let n;
				if ("DATE" === e.type) n = ` DATE \\@ "${e.dateFormat ?? "M/d/yyyy"}" `;
				else if ("REF" === e.type || "PAGEREF" === e.type) {
					const t = e.bookmark ?? "", r = /\s/.test(t) ? `"${t}"` : t;
					n = ` ${e.type} ${r} \\h `;
				} else {
					const t = "PAGE" === e.type ? " PAGE " : " NUMPAGES ", r = function(e) {
						if (e && "decimal" !== e) return e;
					}(e.format);
					n = r ? ` ${t.trim()} \\* ${r} ` : t;
				}
				return `<w:fldSimple w:instr="${Vt(n)}"><w:r>${t}<w:t xml:space="preserve">${Vt(r)}</w:t></w:r></w:fldSimple>`;
			}(e.field, s(), e.text),
			textBox: (e) => cs(e, e.textBox, t, n, s(), o),
			image: (e) => {
				const r = t.imageMap.get(e.id);
				if (r) {
					const n = ls(e.id, r, t, s());
					if (null !== n) return n;
				}
				return l();
			},
			sym: (e) => `<w:r>${s()}<w:sym w:font="${Vt(e.sym.font)}" w:char="${e.sym.char}"/></w:r>`,
			math: (e) => function(e) {
				const t = `<m:oMath>${hs(e.children)}</m:oMath>`;
				return e.display ? `<m:oMathPara>${t}</m:oMathPara>` : t;
			}(e.math),
			opaque: () => {
				throw new Error("Unexpected opaque serializer dispatch");
			},
			text: () => l()
		}));
	}
	function Os(e, t, r, n, o) {
		let i = Ms(e, t, r, n, o);
		if (e.revisionRangeMarker) return i;
		"delete" === e.revision?.type && (i = Oa(i));
		const a = e.styles?.link, s = a ? function(e, t, r) {
			if (t.startsWith("#")) return `<w:hyperlink w:anchor="${Vt(t.slice(1))}">${e}</w:hyperlink>`;
			const n = r.hyperlinkMap.get(t);
			return n ? `<w:hyperlink r:id="${n}">${e}</w:hyperlink>` : e;
		}(i, a, t) : i;
		return e.revision ? function(e, t) {
			const r = La(t), n = function(e) {
				return "from" === e.move ? "moveFrom" : "to" === e.move ? "moveTo" : "delete" === e.type ? "del" : "ins";
			}(t);
			return `<w:${n} ${r}>${e}</w:${n}>`;
		}(s, e.revision) : s;
	}
	function Fs(e, t) {
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
			const l = Fs(a, t);
			r += `<w:sdt>${ta(i.sdtPr)}${i.sdtEndPrXml ?? ""}<w:sdtContent>${l}</w:sdtContent></w:sdt>`, n = s;
		}
		return r;
	}
	const Ls = /* @__PURE__ */ new Set([
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
	function Bs(e) {
		return /\br:(?:id|embed|link)\s*=/.test(e);
	}
	function Us(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function zs(e) {
		return e.localName ?? e.tagName;
	}
	function Hs(e) {
		return `${e.namespaceURI ?? ""}\0${zs(e)}`;
	}
	function js(e, t) {
		if (!e || Bs(e)) return t;
		const r = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "pPr" === zs(t) ? t : void 0;
		}(e), n = function(e) {
			if (e) {
				const t = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}">${e}</oasis:root>`, "application/xml").documentElement, r = t ? Us(t) : [];
				if (1 === r.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === r[0].namespaceURI && "pPr" === zs(r[0])) return r[0];
			}
			return new b.DOMParser().parseFromString(`<w:pPr xmlns:w="${Ht}"/>`, "application/xml").documentElement;
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
		const o = Us(r), i = Us(n), a = /* @__PURE__ */ new Map();
		for (const u of i) {
			const e = Hs(u), t = a.get(e) ?? [];
			t.push(u), a.set(e, t);
		}
		const s = /* @__PURE__ */ new Map();
		for (const u of o) {
			const e = Hs(u), t = s.get(e) ?? 0;
			s.set(e, t + 1);
			const r = a.get(e)?.[t];
			r && ua(u, r);
		}
		const l = new Set(i.map(Hs)), c = o.filter((e) => {
			return !(t = e, "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t.namespaceURI && Ls.has(zs(t)) || l.has(Hs(e)));
			var t;
		});
		for (const u of c) {
			const e = o.indexOf(u), t = o.slice(e + 1).find((e) => l.has(Hs(e))), r = t ? Us(n).find((e) => Hs(e) === Hs(t)) ?? null : null;
			n.insertBefore(u.cloneNode(!0), r);
		}
		return t || 1 !== n.attributes.length || 0 !== Us(n).length ? new b.XMLSerializer().serializeToString(n) : "";
	}
	const qs = /* @__PURE__ */ new Set([
		"pPr",
		"r",
		"hyperlink",
		"fldSimple",
		"bookmarkStart",
		"bookmarkEnd",
		"commentRangeStart",
		"commentRangeEnd"
	]);
	function Ws(e) {
		const t = [];
		for (let r = 0; r < e.childNodes.length; r += 1) {
			const n = e.childNodes[r];
			n?.nodeType === n.ELEMENT_NODE && t.push(n);
		}
		return t;
	}
	function Vs(e) {
		return e.localName ?? e.tagName;
	}
	function Gs(e, t) {
		const r = new b.DOMParser().parseFromString(`<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:r="${qt}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${e}</oasis:root>`, "application/xml").documentElement;
		if (!r) return;
		const n = Ws(r);
		return 1 === n.length && "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === n[0].namespaceURI && Vs(n[0]) === t ? n[0] : void 0;
	}
	function Xs(e) {
		return "http://www.w3.org/2000/xmlns/" === e.namespaceURI || "xmlns" === e.prefix || "xmlns" === e.name;
	}
	function Zs(e, t) {
		const r = (n = "pPr", Ws(e).find((e) => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === e.namespaceURI && Vs(e) === n));
		var n;
		if (!t) return r && e.removeChild(r), !0;
		const o = Gs(t, "pPr");
		if (!o) return !1;
		const i = o.cloneNode(!0);
		return r ? e.replaceChild(i, r) : e.insertBefore(i, e.firstChild), !0;
	}
	function Ys(e, t, r, n) {
		const o = Io(e)?.xml;
		if (!o || n.hasOverrides || n.hasBoundaryTokens || e.dropCap || /\br:(?:id|embed|link)\s*=/.test(o)) return;
		const i = function(e) {
			const t = new b.DOMParser().parseFromString(e, "application/xml").documentElement;
			return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" === t?.namespaceURI && "p" === Vs(t) ? t : void 0;
		}(o);
		if (!i || !function(e) {
			for (let t = 0; t < e.attributes.length; t += 1) {
				const r = e.attributes[t];
				if (r && !Xs(r) && "http://schemas.openxmlformats.org/officeDocument/2006/relationships" !== r.namespaceURI) return !0;
			}
			return Ws(e).some((e) => {
				const t = Vs(e);
				return "http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== e.namespaceURI || !qs.has(t);
			});
		}(i)) return;
		const a = function(e) {
			const t = [], r = (e) => {
				for (const n of Ws(e)) {
					const e = Vs(n);
					"http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== n.namespaceURI || "r" !== e ? ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== n.namespaceURI || "pPr" !== e && "p" !== e && "tbl" !== e && "txbxContent" !== e) && r(n) : t.push(n);
				}
			};
			return r(e), t;
		}(i);
		if (a.length !== r.length) return;
		const s = r.map((e) => Gs(e, "r"));
		if (!s.some((e) => !e) && Zs(i, t)) {
			for (let e = 0; e < a.length; e += 1) a[e].parentNode?.replaceChild(s[e].cloneNode(!0), a[e]);
			return new b.XMLSerializer().serializeToString(i);
		}
	}
	function Qs(e, t) {
		return e.rows.some((e) => e.cells.some((e) => e.blocks.some((e) => function(e, t) {
			switch (e.type) {
				case "paragraph": return Boolean(t.bookmarkEventsByParagraph?.has(e.id) || t.commentEventsByParagraph?.has(e.id));
				case "table": return Qs(e, t);
				default: return pe(e, "block");
			}
		}(e, t))));
	}
	function Ks(e, t, r) {
		switch (e.type) {
			case "paragraph": return el(e, t, r);
			case "table": return (e.style?.pageBreakBefore ? "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>" : "") + ((function(e) {
				const t = Oo(e)?.xml;
				return Boolean(t && /<w:trPr(?:\s|>)[\s\S]*?<w:jc\b[^>]*\bw:val="(?:start|end)"/.test(t));
			}(e) ? void 0 : function(e, t) {
				const r = Oo(e);
				if (r && !t.hasBoundaryTokens && !wo(r.xml)) return r.semanticSignature === _o(e) ? r.xml : void 0;
			}(e, { hasBoundaryTokens: Qs(e, t) })) ?? Da(e, (e, n) => function(e, t, r, n) {
				return "paragraph" === e.type ? el(e, r, n, { align: t.style?.horizontalAlign }) : Ks(e, r, n);
			}(e, n, t, r)));
			default: return pe(e, "block");
		}
	}
	function Js(e, t, r) {
		let n = "", o = 0;
		for (; o < e.length;) {
			const i = e[o], a = i.sdtWrappers?.[0];
			if (!a) {
				n += Ks(i, t, r), o += 1;
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
			const c = Js(s, t, r);
			n += `<w:sdt>${ta(a.sdtPr)}${a.sdtEndPrXml ?? ""}<w:sdtContent>${c}</w:sdtContent></w:sdt>`, o = l;
		}
		return n;
	}
	function el(e, t, r, n) {
		const o = e.runs.length > 0 ? e.runs : [{
			id: "",
			text: "",
			kind: "text"
		}], i = e.dropCap ? function(e) {
			const t = ts(e.style);
			return `<w:p><w:pPr><w:keepNext/><w:framePr w:dropCap="${e.type}" w:lines="${e.lines}" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/><w:spacing w:after="0"/>${t ? `<w:rPr>${r = t, r.replace(/^<w:rPr>/, "").replace(/<\/w:rPr>$/, "")}</w:rPr>` : ""}</w:pPr><w:r>${t}${ns(e.text)}</w:r></w:p>`;
			var r;
		}(e.dropCap) : "", a = t.bookmarkEventsByParagraph?.get(e.id), s = t.commentEventsByParagraph?.get(e.id), l = [...(a ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: xi(e)
		})), ...(s ?? []).map((e) => ({
			offset: e.offset,
			seq: e.seq,
			xml: Ei(e)
		}))], c = function(e, t) {
			const r = Io(e);
			if (!(!r?.xml || !r.semanticSignature || t.hasOverrides || t.hasBoundaryTokens || wo(r.xml) || fo.test(r.xml) || ho.test(r.xml))) return r.semanticSignature === ko(e) ? r.xml : void 0;
		}(e, {
			hasOverrides: Boolean(n),
			hasBoundaryTokens: l.length > 0
		});
		if (c) return c;
		const u = (n) => Os(n, t, e.style?.styleId, r, Js), d = 0 === l.length ? o.map(u) : void 0, p = 0 === l.length ? Fs(o, u) : function(e, t, r, n, o) {
			const i = [...t].sort((e, t) => e.offset - t.offset || e.seq - t.seq);
			let a = 0, s = 0, l = Fs(e, (e) => {
				let t = "";
				const l = s, c = l + e.text.length;
				for (; a < i.length && i[a].offset <= l;) t += i[a].xml, a += 1;
				if (function(e) {
					return "text" === e.kind || "sym" === e.kind;
				}(e) && e.text.length > 0) {
					let s = l;
					for (; a < i.length && i[a].offset < c;) {
						const c = i[a];
						c.offset > s && (t += Os({
							...e,
							text: e.text.slice(s - l, c.offset - l)
						}, r, n, o, Js)), t += c.xml, a += 1, s = c.offset;
					}
					s < c && (t += Os({
						...e,
						text: e.text.slice(s - l)
					}, r, n, o, Js));
				} else t += Os(e, r, n, o, Js);
				return s = c, t;
			});
			for (; a < i.length;) l += i[a].xml, a += 1;
			return l;
		}(o, l, t, e.style?.styleId, r), f = function(e) {
			return Io(e)?.attributes;
		}(e), h = f ? ` ${f}` : "", g = function(e, t, r) {
			const n = Io(e)?.paragraphProperties;
			return !n || Bs(n.xml) ? t : r || e.list || n.semanticSignature !== To(e) ? js(n.xml, t) : n.xml;
		}(e, qa(e, t.numberingInfo, r, n), Boolean(n));
		if (d) {
			const t = Ys(e, g, d, {
				hasOverrides: Boolean(n),
				hasBoundaryTokens: !1
			});
			if (t) return t;
		}
		return `${i}<w:p${h}>${g}${p}</w:p>`;
	}
	function tl(e) {
		const t = e.footnotes?.items;
		if (!t) return [];
		const r = /* @__PURE__ */ new Map(), n = Ti(t);
		for (const { run: o } of function(e) {
			return ei(e, "footnoteReference");
		}(e)) {
			const e = fe(o);
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
	function rl(e) {
		if (0 === e.length) return [nl()];
		const [t, ...r] = e;
		return "paragraph" !== t.type ? [
			nl(!0),
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
	function nl(e = !0) {
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
	function ol(e) {
		const t = e.endnotes?.items;
		if (!t) return [];
		const r = /* @__PURE__ */ new Map(), n = Ti(t);
		for (const { run: o } of function(e) {
			return ei(e, "endnoteReference");
		}(e)) {
			const e = he(o);
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
	function il(e) {
		if (0 === e.length) return [al()];
		const [t, ...r] = e;
		return "paragraph" !== t.type ? [
			al(!0),
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
	function al(e = !0) {
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
	const sl = [
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
	function ll(e) {
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
		return Object.keys(t).length > 0 ? Wi({
			id: "table-style-cell",
			blocks: [],
			style: t
		}) : "";
	}
	function cl(e, t) {
		if ("number" == typeof t) return `<w:${e} w:w="${Zt(t) ?? 0}" w:type="dxa"/>`;
		if ("string" == typeof t && t.endsWith("%")) {
			const r = Number.parseFloat(t);
			return Number.isFinite(r) ? `<w:${e} w:w="${Math.round(50 * r)}" w:type="pct"/>` : "";
		}
		return "auto" === t ? `<w:${e} w:w="0" w:type="auto"/>` : "";
	}
	function ul(e) {
		if (!e) return "";
		const t = [];
		void 0 !== e.rowBandSize && t.push(`<w:tblStyleRowBandSize w:val="${e.rowBandSize}"/>`), void 0 !== e.colBandSize && t.push(`<w:tblStyleColBandSize w:val="${e.colBandSize}"/>`);
		const r = cl("tblW", e.width);
		r && t.push(r);
		const n = cl("tblInd", e.indentLeft);
		n && t.push(n);
		const o = cl("tblCellSpacing", e.cellSpacing);
		if (o && t.push(o), e.align && t.push(`<w:jc w:val="${e.align}"/>`), e.layout && t.push(`<w:tblLayout w:type="${e.layout}"/>`), void 0 !== e.bidiVisual && t.push(`<w:bidiVisual w:val="${e.bidiVisual ? "1" : "0"}"/>`), e.defaultCellMargins) {
			const r = Object.entries(e.defaultCellMargins).map(([e, t]) => `<w:${e} w:w="${Zt(t) ?? 0}" w:type="dxa"/>`).join("");
			r && t.push(`<w:tblCellMar>${r}</w:tblCellMar>`);
		}
		if (e.borders) {
			const { borders: r } = e, n = Sr.filter(([, e]) => !!r[e]).map(([e, t]) => `<w:${e} ${Pi(r[t])}`).join("");
			n && t.push(`<w:tblBorders>${n}</w:tblBorders>`);
		}
		return t.length > 0 ? `<w:tblPr>${$i(t, Ci)}</w:tblPr>` : "";
	}
	function dl(e, t) {
		const r = [], n = t.paragraphStyle ? ja(t.paragraphStyle) : "";
		n && r.push(n);
		const o = t.textStyle ? ts(t.textStyle) : "";
		o && r.push(o);
		const i = ul(t.tableStyle);
		i && r.push(i);
		const a = t.rowStyle ? Xi(t.rowStyle) : "";
		a && r.push(a);
		const s = ll(t);
		return s && r.push(s), 0 === r.length ? "" : `<w:tblStylePr w:type="${Vt(e)}">${r.join("")}</w:tblStylePr>`;
	}
	function pl(e) {
		const t = [];
		t.push(`<w:name w:val="${Vt(e.name)}"/>`), e.basedOn && t.push(`<w:basedOn w:val="${Vt(e.basedOn)}"/>`), e.nextStyle && t.push(`<w:next w:val="${Vt(e.nextStyle)}"/>`), void 0 !== e.uiPriority && t.push(`<w:uiPriority w:val="${Math.max(0, Math.floor(e.uiPriority))}"/>`);
		for (const r of [
			"qFormat",
			"semiHidden",
			"unhideWhenUsed"
		]) {
			const n = e[r];
			void 0 !== n && t.push(n ? `<w:${r}/>` : `<w:${r} w:val="off"/>`);
		}
		if (("paragraph" === e.type || "table" === e.type) && e.paragraphStyle) {
			const r = ja(e.paragraphStyle);
			r && t.push(r);
		}
		if (e.textStyle) {
			const r = ts(e.textStyle);
			r && t.push(r);
		}
		if ("table" === e.type && e.tableStyle) {
			const r = e.tableStyle, n = ul(r);
			if (n && t.push(n), r.conditionalFormats) {
				const e = [...sl.filter((e) => e in r.conditionalFormats), ...Object.keys(r.conditionalFormats).filter((e) => !sl.includes(e))];
				for (const n of e) {
					const e = r.conditionalFormats[n];
					if (e) {
						const r = dl(n, e);
						r && t.push(r);
					}
				}
			}
		}
		return `<w:style w:type="${"character" === e.type ? "character" : "table" === e.type ? "table" : "paragraph"}" w:styleId="${Vt(e.id)}"${e.isDefault ? " w:default=\"1\"" : ""}${void 0 !== e.customStyle ? ` w:customStyle="${e.customStyle ? "1" : "0"}"` : ""}>${$i(t, Ai)}</w:style>`;
	}
	function fl(e, t, r, n, o, i, a, s, l, c = !1) {
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
				const o = mt[e];
				o && (t.add(e), r += `<Default Extension="${e}" ContentType="${o}"/>`);
			}
			return r;
		}(t)}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${a ? "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" : ""}${e ? "<Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/>" : ""}${r ? "<Override PartName=\"/word/settings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml\"/>" : ""}${o ? "<Override PartName=\"/word/footnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml\"/>" : ""}${i ? "<Override PartName=\"/word/endnotes.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml\"/>" : ""}${s ? "<Override PartName=\"/word/comments.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml\"/><Override PartName=\"/word/commentsExtended.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml\"/>" : ""}${l ? "<Override PartName=\"/word/fontTable.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml\"/>" : ""}${c ? "<Override PartName=\"/word/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>" : ""}${u}</Types>`;
	}
	const hl = {
		decimal: "decimal",
		lowerRoman: "lowerRoman",
		upperRoman: "upperRoman",
		lowerLetter: "lowerLetter",
		upperLetter: "upperLetter",
		symbol: "symbol"
	}, ml = {
		continuous: "continuous",
		eachSection: "eachSect"
	};
	function gl(e, t) {
		if (!t) return null;
		const r = [];
		return t.numberFormat && r.push(`<w:numFmt w:val="${hl[t.numberFormat]}"/>`), void 0 !== t.startAt && r.push(`<w:numStart w:val="${Math.max(1, t.startAt)}"/>`), t.restart && r.push(`<w:numRestart w:val="${ml[t.restart]}"/>`), r.length > 0 ? `<w:${e}>${r.join("")}</w:${e}>` : null;
	}
	function wl(e, t, r, n, o, i, a) {
		const s = [], l = Zt(t);
		null !== l && Number.isFinite(l) && l > 0 && s.push(`<w:defaultTabStop w:val="${l}"/>`), i?.autoHyphenation && s.push("<w:autoHyphenation/>"), void 0 !== i?.consecutiveHyphenLimit && i.consecutiveHyphenLimit >= 0 && s.push(`<w:consecutiveHyphenLimit w:val="${i.consecutiveHyphenLimit}"/>`);
		const c = Zt(i?.hyphenationZone);
		null !== c && s.push(`<w:hyphenationZone w:val="${c}"/>`), i?.doNotHyphenateCaps && s.push("<w:doNotHyphenateCaps/>");
		const u = gl("footnotePr", r);
		u && s.push(u);
		const d = gl("endnotePr", n);
		return d && s.push(d), e && s.push("<w:evenAndOddHeaders/>"), o && s.push("<w:compat><w:allowSpaceOfSameStyleInTable/></w:compat>"), s.push(function(e) {
			if (!e) return "";
			const t = Object.entries(e);
			if (t.length > 256) return "";
			const r = /* @__PURE__ */ new Set(), n = [];
			for (const [o, i] of t) {
				if (!Kt(o) || "string" != typeof i || !Jt(i)) return "";
				const e = o.toLowerCase();
				if (r.has(e) || "__proto__" === e || "prototype" === e || "constructor" === e) return "";
				r.add(e), n.push("<w:docVar w:name=\"" + Vt(o) + "\" w:val=\"" + Vt(i) + "\"/>");
			}
			return n.length ? "<w:docVars>" + n.join("") + "</w:docVars>" : "";
		}(a)), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${Ht}">${s.join("")}</w:settings>`;
	}
	function bl(e, t) {
		let r = "";
		for (const n of t) r += `<Relationship Id="${n.rId}" Type="${qt}/hyperlink" Target="${Vt(n.href)}" TargetMode="External"/>`;
		for (const n of e) {
			const e = "linked" === n.kind ? " TargetMode=\"External\"" : "";
			r += `<Relationship Id="${n.rId}" Type="${qt}/image" Target="${Vt(n.target)}"${e}/>`;
		}
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${jt}">${r}</Relationships>`;
	}
	function vl(e, t) {
		t(e);
		for (const r of e.runs) "textBox" === r.kind && yl(r.textBox.blocks, t);
	}
	function yl(e, t) {
		for (const r of e) switch (r.type) {
			case "paragraph":
				vl(r, t);
				break;
			case "table":
				for (const e of r.rows) for (const r of e.cells) yl(r.blocks, t);
				break;
			default: pe(r, "block");
		}
	}
	function xl(e, t) {
		for (let r = 0; r < e.attributes.length; r += 1) {
			const n = e.attributes.item(r);
			if (n?.localName === t) return n.value;
		}
	}
	function El(e, t, r) {
		if (!e) return 0;
		const n = new b.DOMParser().parseFromString(e, "application/xml");
		let o = 0;
		for (const i of Array.from(n.getElementsByTagNameNS(Ht, t))) {
			const e = xl(i, r);
			if (!e || !/^\d+$/.test(e)) continue;
			const t = Number.parseInt(e, 10);
			Number.isSafeInteger(t) && (o = Math.max(o, t));
		}
		return o;
	}
	function Nl(e, t) {
		return void 0 !== e && Number.isSafeInteger(e) && e >= t;
	}
	function Sl(e) {
		const t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), n = [], o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = function(e) {
			const t = e.sourcePackage;
			if (!t) return;
			const r = t.parts[t.mainDocumentPart]?.relationships?.find((e) => "External" !== e.targetMode && e.type.endsWith("/numbering") && Boolean(e.resolvedTarget)), n = r?.resolvedTarget ? t.parts[r.resolvedTarget] : void 0;
			return "xml" === n?.kind ? n.data : void 0;
		}(e);
		let s = Math.max(1, El(a, "abstractNum", "abstractNumId") + 1), l = Math.max(1, El(a, "num", "numId") + 1);
		const c = (e) => {
			if (Nl(e, 0) && !o.has(e)) return o.add(e), e;
			for (; o.has(s);) s += 1;
			const t = s;
			return s += 1, o.add(t), t;
		}, u = (e) => {
			if (Nl(e, 1) && !i.has(e)) return i.add(e), e;
			for (; i.has(l);) l += 1;
			const t = l;
			return l += 1, i.add(t), t;
		}, d = [], p = (e) => {
			e.list && d.push(e);
		};
		for (const f of Oe(e)) yl(f.blocks, p), f.header && yl(f.header, p), f.firstPageHeader && yl(f.firstPageHeader, p), f.evenPageHeader && yl(f.evenPageHeader, p), f.footer && yl(f.footer, p), f.firstPageFooter && yl(f.firstPageFooter, p), f.evenPageFooter && yl(f.evenPageFooter, p);
		for (const f of d) {
			const e = f.list, o = Math.max(0, e.level ?? 0), i = e.bulletGlyph ?? "", a = e.instanceId ? `instance:${e.instanceId}` : `legacy:${e.kind}:${o}:${i}`;
			let s = r.get(a);
			if (!s) {
				const t = rr(e), o = void 0 !== t?.sourceNumId && e.instanceId === String(t.sourceNumId);
				s = {
					abstractNumId: c(o ? t.sourceAbstractNumId : void 0),
					numId: u(o ? t.sourceNumId : void 0),
					levels: []
				}, r.set(a, s), n.push(s);
			}
			if (!s.levels.some((e) => e.level === o)) {
				const t = rr(e), r = nr(e);
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
	const kl = `xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:r="${qt}"`;
	function Tl(e, t, r, n) {
		const o = Gt(e.width, 12240), i = Gt(e.height, 15840), a = e.margins, s = "landscape" === e.orientation ? " w:orient=\"landscape\"" : "", l = [
			t?.header?.first ? `<w:headerReference w:type="first" r:id="${t.header.first.relId}"/>` : "",
			t?.header?.even ? `<w:headerReference w:type="even" r:id="${t.header.even.relId}"/>` : "",
			t?.header?.default ? `<w:headerReference w:type="default" r:id="${t.header.default.relId}"/>` : "",
			t?.footer?.first ? `<w:footerReference w:type="first" r:id="${t.footer.first.relId}"/>` : "",
			t?.footer?.even ? `<w:footerReference w:type="even" r:id="${t.footer.even.relId}"/>` : "",
			t?.footer?.default ? `<w:footerReference w:type="default" r:id="${t.footer.default.relId}"/>` : ""
		].join(""), c = t?.header?.first || t?.footer?.first ? "<w:titlePg/>" : "", u = n && "nextPage" !== n ? `<w:type w:val="${n}"/>` : "", d = e.columns;
		let p = "";
		if (d && d.count > 1) {
			const e = Gt(d.space, 0), t = d.separator ? " w:sep=\"1\"" : "";
			if (!1 === d.equalWidth && d.columns?.length) {
				const r = d.columns.map((e) => `<w:col w:w="${Gt(e.width, 0)}" w:space="${Gt(e.space, 0)}"/>`).join("");
				p = `<w:cols w:num="${d.count}" w:space="${e}" w:equalWidth="0"${t}>${r}</w:cols>`;
			} else p = `<w:cols w:num="${d.count}" w:space="${e}"${t}/>`;
		}
		const f = r.pageNumbering;
		let h = "";
		if (f) {
			const e = [];
			void 0 !== f.start && e.push(`w:start="${f.start}"`), f.format && e.push(`w:fmt="${Vt(f.format)}"`), f.chapterStyle && e.push(`w:chapStyle="${Vt(f.chapterStyle)}"`), f.chapterSeparator && e.push(`w:chapSep="${Vt(f.chapterSeparator)}"`), e.length > 0 && (h = `<w:pgNumType ${e.join(" ")}/>`);
		}
		const m = r.verticalAlignment && "top" !== r.verticalAlignment ? `<w:vAlign w:val="${r.verticalAlignment}"/>` : "", g = r.bidi ? "<w:bidi/>" : "", w = r.pageBorder, b = w?.color.replace("#", "").toUpperCase(), v = w ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:left w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:bottom w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/><w:right w:val="${w.style}" w:sz="${Math.max(1, Math.round(8 * w.width))}" w:space="${Math.max(0, Math.round(w.distance ?? 0))}" w:color="${b}"/></w:pgBorders>` : "", y = r.propertyRevision ? `<w:sectPrChange ${La(r.propertyRevision)}>${Tl(r.propertyRevision.previous.pageSettings, void 0, (x = r.propertyRevision.previous, {
			id: "section:revision",
			blocks: [],
			pageSettings: x.pageSettings,
			...void 0 !== x.pageBorder ? { pageBorder: x.pageBorder } : {},
			...x.pageNumbering ? { pageNumbering: x.pageNumbering } : {},
			...x.verticalAlignment ? { verticalAlignment: x.verticalAlignment } : {},
			...void 0 !== x.bidi ? { bidi: x.bidi } : {}
		}), r.propertyRevision.previous.nextBreakType)}</w:sectPrChange>` : "";
		var x;
		return `<w:sectPr>${l}${c}${u}<w:pgSz w:w="${o}" w:h="${i}"${s}/><w:pgMar w:top="${Gt(a.top, 1440)}" w:right="${Gt(a.right, 1440)}" w:bottom="${Gt(a.bottom, 1440)}" w:left="${Gt(a.left, 1440)}" w:header="${Gt(a.header, 720)}" w:footer="${Gt(a.footer, 720)}" w:gutter="${Gt(a.gutter, 0)}"/>${h}${p}${m}${g}${v}${y}</w:sectPr>`;
	}
	function Il(e, t, r) {
		const n = Oe(e), o = n.map((o, i) => Js(o.blocks, t, e.styles) + Tl(o.pageSettings, r[i], o, n[i + 1]?.breakType)).join(""), i = e.design?.pageColor?.replace("#", "").toUpperCase();
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${kl}>${i ? `<w:background w:color="${i}"/>` : ""}<w:body>${o}</w:body></w:document>`;
	}
	function _l(e, t, r, n, o) {
		const i = "header" === e ? "hdr" : "ftr", a = "header" === e && "text" === o?.kind && o.text ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml"><v:shape type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#94a3b8"}" fillopacity="${o.opacity ?? .25}"><v:textpath on="true" string="${Vt(o.text)}" style="font-family:${Vt(o.fontFamily ?? "Arial")};font-size:${o.fontSize ?? 48}pt"/></v:shape></w:pict>` : "header" === e && "image" === o?.kind && r.images.some((e) => "__watermark" === e.runId) ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shape type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${o.rotation ?? -45}" fillcolor="${o.color ?? "#ffffff"}" fillopacity="${o.opacity ?? .25}" stroked="f"><v:imagedata r:id="rIdWatermark" o:title="Watermark"/></v:shape></w:pict>` : "";
		return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${i} ${kl}>${a}${Js(t, r, n)}</w:${i}>`;
	}
	function Cl(e) {
		const t = [], r = [], n = [], o = (e, t) => {
			(e.separator ? e.result : e.code).push(t);
		}, i = (e, t) => {
			r.push({
				kind: e,
				point: t
			});
		};
		for (const [a, s] of e.entries()) {
			let e = 0;
			for (const [r, l] of s.runs.entries()) {
				const c = {
					paragraphId: s.id,
					paragraphIndex: a,
					runId: l.id,
					runIndex: r,
					offset: e
				};
				e += l.text.length;
				const u = n.at(-1);
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
						}), t.push(e), n.push(e);
						break;
					}
					case "separate":
						u ? u.separator ? i("duplicate-separator", c) : u.separator = c : i("orphan-separator", c);
						break;
					case "end": u ? (u.end = c, n.pop()) : i("orphan-end", c);
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
		for (const a of n) i("unclosed-field", a.begin);
		return {
			spans: t,
			diagnostics: r
		};
	}
	const Al = [
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
	function Rl(e) {
		if (!e.length || e.length > 256) return;
		const t = [];
		for (let r = 0; r < e.length;) {
			const n = e[r];
			if ("'" === n) {
				const n = e.indexOf("'", r + 1);
				if (n < 0) return;
				t.push({ literal: e.slice(r + 1, n) }), r = n + 1;
				continue;
			}
			const o = Al.find((t) => e.startsWith(t, r));
			if (o) {
				if (r += o.length, r < e.length && e[r] === o[0] && "am/pm" !== o && "AM/PM" !== o) return;
				t.push({ token: o });
			} else {
				if (/[\p{L}\\\x00-\x1f]/u.test(n)) return;
				t.push({ literal: n }), r++;
			}
		}
		return t.some((e) => "token" in e) ? t : void 0;
	}
	function Dl(e) {
		return !!Rl(e);
	}
	const $l = /* @__PURE__ */ new Set([
		"DATE",
		"TIME",
		"CREATEDATE",
		"SAVEDATE",
		"PRINTDATE"
	]), Pl = {
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
	}, Ml = /* @__PURE__ */ new Set([
		"PAGE",
		"NUMPAGES",
		"SECTION",
		"SECTIONPAGES"
	]), Ol = /* @__PURE__ */ new Set(["REF", "PAGEREF"]), Fl = {
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
	function Ll(e) {
		const t = An(e);
		if (t.error || !t.command) return;
		const r = t.tokens.slice(1);
		if ("DOCPROPERTY" === t.command) {
			if (1 !== r.length && 3 !== r.length) return;
			const e = r[0];
			if (!e || "word" !== e.kind && "quoted" !== e.kind || e.value.length < 1 || e.value.length > 128 || !/^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e.value)) return;
			if (3 === r.length && ("switch" !== r[1]?.kind || "*" !== r[1].value || "word" !== r[2]?.kind || "MERGEFORMAT" !== r[2].value)) return;
			return {
				type: "DOCPROPERTY",
				name: e.value
			};
		}
		if ("DOCVARIABLE" === t.command) {
			if (1 !== r.length || "word" !== r[0]?.kind && "quoted" !== r[0]?.kind) return;
			const e = r[0].value;
			if (e.length < 1 || e.length > 128 || !/^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(e)) return;
			return {
				type: "DOCVARIABLE",
				name: e
			};
		}
		if ("IF" === t.command) {
			if (5 !== r.length) return;
			const [e, t, n, o, i] = r;
			if (!e || !t || !n || !o || !i || "word" !== e.kind && "quoted" !== e.kind || "word" !== t.kind || ![
				"=",
				"<>",
				"<",
				">",
				"<=",
				">="
			].includes(t.value) || "word" !== n.kind && "quoted" !== n.kind || "quoted" !== o.kind || "quoted" !== i.kind || [
				e,
				n,
				o,
				i
			].some((e) => e.value.length > 4096 || /[\r\n\t]/.test(e.value))) return;
			const a = (e) => "quoted" === e.kind || /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(e.value);
			if (!a(e) || !a(n)) return;
			const s = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, l = s.test(e.value) && s.test(n.value);
			if (l && (!Number.isFinite(Number(e.value)) || !Number.isFinite(Number(n.value)))) return;
			if (!l && "=" !== t.value && "<>" !== t.value) return;
			return {
				type: "IF",
				left: e.value,
				right: n.value,
				operator: t.value,
				whenTrue: o.value,
				whenFalse: i.value,
				numeric: l
			};
		}
		if ("STYLEREF" === t.command) {
			const e = r[0];
			if (!e || "quoted" !== e.kind && "word" !== e.kind || !e.value.trim() || e.value.length > 128 || /[\r\n\t\\]/.test(e.value)) return;
			let t, n = !1;
			for (const o of r.slice(1)) {
				if ("switch" !== o.kind) return;
				const e = o.value.toLowerCase();
				if ("l" === e) {
					if (n) return;
					n = !0;
				} else {
					if ("n" !== e && "p" !== e) return;
					if (t) return;
					t = "n" === e ? "number" : "position";
				}
			}
			return t ? {
				type: "STYLEREF",
				style: e.value,
				lastOnPage: n,
				output: t
			} : {
				type: "STYLEREF",
				style: e.value,
				lastOnPage: n
			};
		}
		if ("SEQ" === t.command) {
			const e = r[0];
			if (!e || "word" !== e.kind || !/^\p{L}[\p{L}\p{N}_]{0,39}$/u.test(e.value)) return;
			const t = {
				type: "SEQ",
				identifier: e.value.toLowerCase(),
				operation: "next"
			}, n = /* @__PURE__ */ new Set();
			for (let o = 1; o < r.length; o++) {
				const e = r[o];
				if ("switch" !== e.kind) return;
				const i = e.value.toLowerCase();
				if (n.has(i)) return;
				if (n.add(i), "n" === i || "c" === i || "r" === i) {
					if ([
						"n",
						"c",
						"r"
					].filter((e) => n.has(e)).length > 1) return;
					if (t.operation = "c" === i ? "repeat" : "r" === i ? "reset" : "next", "r" === i) {
						const e = r[++o];
						if ("word" !== e?.kind || !/^\d{1,7}$/.test(e.value) || !Ul(Number(e.value))) return;
						t.reset = Number(e.value);
					}
				} else if ("s" === i) {
					const e = r[++o];
					if ("word" !== e?.kind || !/^[1-9]$/.test(e.value)) return;
					t.headingLevel = Number(e.value);
				} else {
					if ("*" !== i) return;
					{
						const e = r[++o];
						if ("word" !== e?.kind) return;
						const n = "ARABIC" === e.value.toUpperCase() ? "decimal" : Sn(e.value);
						if (!n) return;
						t.format = n;
					}
				}
			}
			if (void 0 !== t.headingLevel && "next" !== t.operation) return;
			return t;
		}
		if ($l.has(t.command)) {
			const e = t.command;
			if (!r.length) return {
				type: e,
				temporal: !0
			};
			if (2 !== r.length || "switch" !== r[0]?.kind || "@" !== r[0].value || "quoted" !== r[1]?.kind || !Dl(r[1].value)) return;
			return {
				type: e,
				temporal: !0,
				picture: r[1].value
			};
		}
		if (Ml.has(t.command)) {
			const e = t.command;
			if (0 === r.length) return { type: e };
			if (2 !== r.length || "switch" !== r[0]?.kind || "*" !== r[0].value || "word" !== r[1]?.kind) return;
			const n = Sn(r[1].value);
			return n ? {
				type: e,
				format: n
			} : void 0;
		}
		if (Ol.has(t.command)) {
			const e = r[0];
			if (!e || "switch" === e.kind || !e.value) return;
			const n = 2 === r.length && "switch" === r[1]?.kind && "h" === r[1].value.toLowerCase();
			if (1 !== r.length && !n) return;
			const o = t.command;
			return n ? {
				type: o,
				bookmark: e.value,
				hyperlink: !0
			} : {
				type: o,
				bookmark: e.value
			};
		}
	}
	function Bl(e, t, r = []) {
		return {
			status: "preserved",
			text: e,
			reason: t,
			dependencies: r
		};
	}
	function Ul(e) {
		return "number" == typeof e && Number.isSafeInteger(e) && e >= 1 && e <= 1e6;
	}
	function zl(e, t, r, n = !1) {
		if (n) return Bl(r, "locked");
		if ("IF_NESTED" === e.type) {
			const n = [{ kind: "literal-condition" }], o = (e) => {
				if ("literal" === e.kind) return e.value;
				const r = e.name.toLowerCase();
				return n.push("document-variable" === e.kind ? {
					kind: "document-variable",
					name: r
				} : {
					kind: "document-property",
					name: r
				}), "document-variable" === e.kind ? tr(t.documentVariables, e.name) : V(t.documentProperties, e.name);
			}, i = o(e.left), a = o(e.right);
			if (void 0 === i || void 0 === a || i.length > 4096 || a.length > 4096 || /[\r\n\t\u0000-\u001f]/.test(i) || /[\r\n\t\u0000-\u001f]/.test(a)) return Bl(r, "unresolved", n);
			const s = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, l = s.test(i) && s.test(a) && Number.isFinite(Number(i)) && Number.isFinite(Number(a));
			if (!l && "=" !== e.operator && "<>" !== e.operator) return Bl(r, "unresolved", n);
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
				dependencies: n
			};
		}
		if ("DOCPROPERTY" === e.type) {
			const n = [{
				kind: "document-property",
				name: e.name.toLowerCase()
			}], o = V(t.documentProperties, e.name);
			return void 0 === o ? Bl(r, "unresolved", n) : {
				status: "resolved",
				text: o,
				dependencies: n
			};
		}
		if ("DOCVARIABLE" === e.type) {
			const n = [{
				kind: "document-variable",
				name: e.name.toLowerCase()
			}], o = tr(t.documentVariables, e.name);
			return void 0 === o ? Bl(r, "unresolved", n) : {
				status: "resolved",
				text: o,
				dependencies: n
			};
		}
		if ("IF" === e.type) {
			const t = [{ kind: "literal-condition" }], r = e.numeric ? Number(e.left) : e.left, n = e.numeric ? Number(e.right) : e.right;
			let o;
			switch (e.operator) {
				case "=":
					o = r === n;
					break;
				case "<>":
					o = r !== n;
					break;
				case "<":
					o = "number" == typeof r && "number" == typeof n && r < n;
					break;
				case ">":
					o = "number" == typeof r && "number" == typeof n && r > n;
					break;
				case "<=":
					o = "number" == typeof r && "number" == typeof n && r <= n;
					break;
				case ">=": o = "number" == typeof r && "number" == typeof n && r >= n;
			}
			return {
				status: "resolved",
				text: o ? e.whenTrue : e.whenFalse,
				dependencies: t
			};
		}
		if ("STYLEREF" === e.type) {
			const n = [{
				kind: "style-text",
				name: e.style,
				lastOnPage: e.lastOnPage
			}], o = t.styleRefText?.(e.style, e.lastOnPage, e.output ?? "text");
			return "string" == typeof o && o.length > 0 ? {
				status: "resolved",
				text: o,
				dependencies: n
			} : Bl(r, "unresolved", n);
		}
		if ("SEQ" === e.type) {
			const n = [{
				kind: "sequence",
				name: e.identifier
			}];
			return Ul(t.sequenceValue) ? {
				status: "resolved",
				text: kn(t.sequenceValue, e.format),
				dependencies: n
			} : Bl(r, "unresolved", n);
		}
		if ("temporal" in e) {
			const n = Pl[e.type], o = [{ kind: n.dependency }], i = t.temporal?.[n.key];
			if (void 0 === i) return Bl(r, "unresolved", o);
			const a = e.picture ?? ("TIME" === e.type ? "HH:mm" : "pt-BR" === t.temporal?.locale ? "dd/MM/yyyy" : "M/d/yyyy");
			if (!Dl(a)) return Bl(r, "unsupported", o);
			const s = function(e, t, r = {}) {
				const n = Rl(t);
				if (!n || !Number.isFinite(e)) return;
				const o = new Date(e);
				if (Number.isFinite(o.getTime())) try {
					const e = {
						timeZone: r.timeZone ?? "UTC",
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
					}).formatToParts(o).map((e) => [e.type, e.value])), i = r.locale ?? "en-US", a = (t) => new Intl.DateTimeFormat(i, {
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
					return n.map((e) => "literal" in e ? e.literal : d[e.token]).join("");
				} catch {
					return;
				}
			}(i, a, t.temporal);
			return void 0 === s ? Bl(r, "unresolved", o) : {
				status: "resolved",
				text: s,
				dependencies: o
			};
		}
		if ("bookmark" in e) {
			const n = [{
				kind: "REF" === e.type ? "bookmark-text" : "bookmark-page",
				name: e.bookmark
			}], o = "REF" === e.type ? t.bookmarkText?.(e.bookmark) : t.bookmarkPage?.(e.bookmark);
			return null === o ? {
				status: "error",
				reason: "missing-bookmark",
				text: "Error! Bookmark not defined.",
				dependencies: n
			} : "REF" === e.type && "string" == typeof o ? {
				status: "resolved",
				text: o,
				dependencies: n
			} : "number" == typeof o && Ul(o) ? {
				status: "resolved",
				text: String(o),
				dependencies: n
			} : Bl(r, "unresolved", n);
		}
		const o = Fl[e.type], i = [{ kind: o.dependency }], a = t[o.key];
		return Ul(a) ? {
			status: "resolved",
			text: kn(a, e.format),
			dependencies: i
		} : Bl(r, "unresolved", i);
	}
	function Hl(e, t) {
		return JSON.stringify([e, t]);
	}
	function jl(e) {
		const t = [], r = [], n = (e, o) => {
			for (const i of e) if ("paragraph" === i.type) t.push(i), r.push(o);
			else for (const e of i.rows) for (const t of e.cells) n(t.blocks, "cell:" + t.id);
		};
		return Oe(e).forEach((e, t) => n(e.blocks, "body:" + t)), function(e, t, r) {
			const n = /* @__PURE__ */ new Map();
			if (new Set(e.map((e) => e.id)).size !== e.length) return n;
			if (e.some((e) => e.runs.some((e) => "opaque" === e.kind || "textBox" === e.kind))) return n;
			const o = Cl(e);
			if (o.diagnostics.length) return n;
			if (r && o.spans.some((e) => {
				if (!e.end) return !0;
				const t = r[e.begin.paragraphIndex];
				for (let n = e.begin.paragraphIndex; n <= e.end.paragraphIndex; n++) if (r[n] !== t) return !0;
				return !1;
			})) return n;
			const i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
			for (const u of o.spans) {
				if ("SEQ" !== An(u.code.map((e) => "instruction" === e.kind ? e.raw : "").join("")).command) continue;
				if (null !== u.parentIndex || !u.end || u.begin.paragraphIndex !== u.end.paragraphIndex) return n;
				const e = a.get(u.begin.paragraphIndex) ?? [];
				e.push(u), a.set(u.begin.paragraphIndex, e);
			}
			const s = Array.from({ length: 9 }, () => 0);
			let l = !1;
			const c = (e) => {
				if (void 0 !== e.style?.outlineLevel) return e.style.outlineLevel;
				let r = e.style?.styleId;
				const n = /* @__PURE__ */ new Set();
				for (; r;) {
					if (n.has(r)) return;
					n.add(r);
					const e = t?.[r];
					if (!e) {
						const e = /^heading\s*([1-9])$/i.exec(r);
						return e ? Number(e[1]) - 1 : "normal" === r.toLowerCase() || "caption" === r.toLowerCase() ? null : void 0;
					}
					if (void 0 !== e.paragraphStyle?.outlineLevel) return e.paragraphStyle.outlineLevel;
					r = e.basedOn;
				}
				return null;
			};
			for (const [u, d] of e.entries()) {
				const e = c(d);
				if (void 0 === e) l = !0;
				else if ("number" == typeof e && Number.isInteger(e) && e >= 0 && e < 9) for (let t = e; t < 9; t++) s[t]++;
				for (const t of a.get(u) ?? []) {
					const e = t.code.map((e) => "instruction" === e.kind ? e.raw : "").join(""), r = An(e).tokens[1]?.value.toLowerCase();
					if (!r) return /* @__PURE__ */ new Map();
					const o = Ll(e), a = i.get(r);
					if ("SEQ" !== o?.type || !t.separator || t.code.some((e) => "instruction" !== e.kind) || 1 !== t.result.length || "run" !== t.result[0]?.kind || "text" !== d.runs[t.result[0].point.runIndex]?.kind || d.runs.some((e) => e.revision || e.revisionRangeMarker || e.sdtWrappers?.length) || d.sdtWrappers?.length || d.numberingRevision) {
						i.set(r, {});
						continue;
					}
					const c = t.result[0].point.runIndex, u = void 0 === o.headingLevel ? void 0 : s[o.headingLevel - 1];
					let p;
					if (p = "reset" === o.operation ? o.reset : "repeat" === o.operation ? a?.value : void 0 !== o.headingLevel ? l || a && void 0 === a.value ? void 0 : a ? a.headingLevel !== o.headingLevel ? void 0 : a.headingGeneration !== u ? 1 : a.value + 1 : 1 : a ? void 0 === a.value ? void 0 : a.value + 1 : 1, void 0 === p || !Number.isSafeInteger(p) || p < 1 || p > 1e6) i.set(r, {});
					else {
						if (t.beginMarker.fieldLock) {
							const e = d.runs[c].text;
							if (zl(o, { sequenceValue: p }, e).text !== e) {
								i.set(r, {});
								continue;
							}
						} else n.set(Hl(d.id, c), p);
						i.set(r, {
							value: p,
							headingLevel: "repeat" === o.operation ? a?.headingLevel : o.headingLevel,
							headingGeneration: "repeat" === o.operation ? a?.headingGeneration : u
						});
					}
				}
			}
			return n;
		}(t, e.styles, r);
	}
	function ql(e) {
		if (!(t = e) || "caption" !== t.style?.styleId?.toLowerCase() || !t.runs.some((e) => {
			const t = function(e) {
				return "fieldInstruction" === e.kind ? e.fieldInstruction : void 0;
			}(e);
			return void 0 !== t && (/* @__PURE__ */ new RegExp("\\bSEQ\\s+Figure\\b", "i")).test(t);
		}) || e.sdtWrappers?.length || e.numberingRevision || e.runs.some((e) => e.revision || e.revisionRangeMarker || e.sdtWrappers?.length)) return;
		var t;
		const r = Cl([e]);
		if (r.diagnostics.length || 1 !== r.spans.length) return;
		const n = r.spans[0];
		if (null !== n.parentIndex || !n.end || !n.separator || n.code.some((e) => "instruction" !== e.kind) || 1 !== n.result.length || "run" !== n.result[0]?.kind) return;
		const o = Ll(n.code.map((e) => "instruction" === e.kind ? e.raw : "").join(""));
		if ("SEQ" !== o?.type || "figure" !== o.identifier) return;
		const i = n.result[0].point.runIndex;
		return "text" !== e.runs[i]?.kind || i <= n.separator.runIndex || i >= n.end.runIndex ? void 0 : {
			field: o,
			begin: n.begin.runIndex,
			end: n.end.runIndex,
			result: i,
			locked: !!n.beginMarker.fieldLock
		};
	}
	function Wl(e) {
		const t = jl(e);
		if (!t.size) return e;
		let r = !1;
		const n = (e) => e.map((e) => {
			if ("paragraph" === e.type) {
				const n = function(e, t) {
					const r = ql(e);
					if (!r || r.locked) return e;
					const n = t.get(Hl(e.id, r.result));
					if (void 0 === n) return e;
					const o = kn(n, r.field.format);
					return e.runs[r.result].text === o ? e : {
						...e,
						runs: e.runs.map((e, t) => t === r.result ? {
							...e,
							text: o
						} : e)
					};
				}(e, t);
				return n !== e && (r = !0), n;
			}
			let o = !1;
			const i = e.rows.map((e) => {
				let t = !1;
				const r = e.cells.map((e) => {
					const r = n(e.blocks);
					return r.some((t, r) => t !== e.blocks[r]) ? (t = !0, {
						...e,
						blocks: r
					}) : e;
				});
				return t ? (o = !0, {
					...e,
					cells: r
				}) : e;
			});
			return o ? {
				...e,
				rows: i
			} : e;
		}), o = Oe(e).map((e) => {
			const t = n(e.blocks);
			return t.some((t, r) => t !== e.blocks[r]) ? {
				...e,
				blocks: t
			} : e;
		});
		return r ? {
			...e,
			sections: o
		} : e;
	}
	const Vl = {
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
	const Gl = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", Xl = (e, t) => Object.hasOwn(e.parts, t), Zl = (e) => /^[A-Za-z0-9_.\-/]+$/.test(e) && !e.startsWith("/") && !e.split("/").some((e) => !e || "." === e || ".." === e), Yl = (e) => /^[A-Za-z0-9_.\-/]+$/.test(e);
	function Ql(e) {
		if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(e)) throw Error("Unsafe XML declaration");
		const t = new b.DOMParser({ onError: () => {
			throw Error("Malformed XML");
		} }).parseFromString(e, "application/xml").documentElement;
		if (!t) throw Error("Missing XML root");
		return t;
	}
	function Kl(e) {
		const t = [], r = [e];
		for (; r.length;) {
			const e = r.pop();
			t.push(e);
			for (const t of Array.from(e.childNodes)) 1 === t.nodeType && r.push(t);
		}
		return t;
	}
	function Jl(e, t) {
		const r = e.split("/").slice(0, -1), n = t.split("/");
		for (; r.length && n.length && r[0] === n[0];) r.shift(), n.shift();
		const o = "../".repeat(r.length) + n.join("/");
		if (E(e, o) !== t) throw Error("Cannot rebase target");
		return o;
	}
	function ec(e, t, r, n) {
		const o = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), s = [], l = /* @__PURE__ */ new Map();
		return yl(e, (e) => {
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
					cx: Math.round(t.image.width * re),
					cy: Math.round(t.image.height * re),
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
				const p = Pe(n, t.image.src).match(/^data:([^;,]+);base64,(.*)$/);
				if (!p) continue;
				const f = wt(p[1]);
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
			authorizedOpaqueFragments: r.authorizedOpaqueFragments,
			numberingInfo: t.numberingInfo,
			definitions: t.definitions,
			images: o,
			imageMap: i,
			textBoxDocPrIds: a,
			hyperlinks: s,
			hyperlinkMap: l
		};
	}
	function tc(e, t, r) {
		r && (e.file(`word/${t}.xml`, r.xml), (r.partContext.images.length > 0 || r.partContext.hyperlinks.length > 0) && e.file(`word/_rels/${t}.xml.rels`, bl(r.partContext.images, r.partContext.hyperlinks)));
	}
	async function rc(e, t) {
		const r = xn(t), n = r.diagnostics.filter((e) => "error" === e.level);
		if (n.length) throw new En(n);
		const o = new Map(r.objects.map((e) => [e.fragmentXml, {
			signature: e.signature,
			kind: e.kind,
			relationshipIds: e.relationshipIds
		}])), i = e.opaqueRelocationIntent;
		if (!i) return nc(e, o);
		const a = function(e, t, r) {
			if (t.ownerPath === r) throw Error("Same-story move does not need relationship relocation");
			if (!Zl(t.ownerPath) || !Zl(r) || !Xl(e, r)) throw Error("Unknown or unsafe destination story");
			const n = xn(e);
			if (n.diagnostics.some((e) => "error" === e.level)) throw Error("Opaque source inventory has errors");
			const o = n.objects.filter((e) => e.signature === t.signature), i = 1 === o.length ? o[0] : void 0;
			if (!i || i.ownerPath !== t.ownerPath || i.ordinal !== t.ordinal) throw Error("Ambiguous original object");
			const a = e.parts[r], s = e.parts[e.mainDocumentPart], l = (t) => {
				const r = e.parts[t];
				if (!r || "xml" !== r.kind) return !1;
				const n = Ql(r.data);
				if ("http://schemas.openxmlformats.org/wordprocessingml/2006/main" !== n.namespaceURI) return !1;
				if (t === e.mainDocumentPart) return "document" === n.localName;
				const o = "hdr" === n.localName ? "header" : "ftr" === n.localName ? "footer" : void 0;
				return Boolean(o && r.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml." + o + "+xml" && s?.relationships?.some((e) => "External" !== e.targetMode && e.type === Gl + "/" + o && e.resolvedTarget === t));
			};
			if (!l(i.ownerPath) || !l(r)) throw Error("Unsupported or unlinked story");
			if (i.partPaths.includes(r) || i.partPaths.includes(i.ownerPath)) throw Error("Story-dependent object closure");
			const c = Ql(i.fragmentXml), u = Ql(a.data), d = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", p = new Set(Kl(u).filter((e) => e.namespaceURI === d && "docPr" === e.localName).map((e) => e.getAttribute("id")));
			if (Kl(c).some((e) => e.namespaceURI === d && "docPr" === e.localName && p.has(e.getAttribute("id")))) throw Error("Destination drawing ID collision");
			const f = e.parts[i.ownerPath]?.relationships ?? [], h = a.relationships ?? [], m = new Set(h.map((e) => e.id));
			if (m.size !== h.length) throw Error("Duplicate destination relationship IDs");
			const g = Kl(u).flatMap((e) => Array.from(e.attributes).map((e) => e.value));
			let w = 1;
			const b = () => {
				let e;
				do
					e = "rIdOasisOpaque" + w++;
				while (m.has(e) || a.data.includes(e) || g.some((t) => t.includes(e)));
				return m.add(e), e;
			}, v = /* @__PURE__ */ new Map(), y = [];
			for (const k of i.relationshipIds) {
				const t = f.filter((e) => e.id === k), n = 1 === t.length ? t[0] : void 0;
				if (!(n && "External" !== n.targetMode && n.resolvedTarget && Yl(n.target) && Zl(n.resolvedTarget) && Xl(e, n.resolvedTarget) && E(i.ownerPath, n.target) === n.resolvedTarget)) throw Error("Unsupported or ambiguous direct relationship " + k);
				const o = b();
				v.set(k, o), y.push({
					...n,
					id: o,
					target: Jl(r, n.resolvedTarget),
					targetMode: "Internal"
				});
			}
			const x = /* @__PURE__ */ new Set();
			for (const E of Kl(c)) for (const e of Array.from(E.attributes)) {
				const t = e.namespaceURI === Gl || "http://purl.oclc.org/ooxml/officeDocument/relationships" === e.namespaceURI || "urn:schemas-microsoft-com:office:office" === e.namespaceURI && "relid" === e.localName, r = v.get(e.value);
				if (t && r) x.add(e.value), E.setAttributeNS(e.namespaceURI, e.name, r);
				else {
					if (!t && "http://www.w3.org/2000/xmlns/" !== e.namespaceURI && [...v.keys()].some((t) => e.value === t)) throw Error("Unknown attribute may carry a relationship reference");
					if (t && e.value && !r) throw Error("Unmapped relationship reference");
				}
			}
			if (x.size !== v.size) throw Error("Source relationship reference missing");
			const N = yn(c);
			if (!N || N.objectKind !== i.kind) throw Error("Relocation changed object kind");
			const S = gn({
				...e,
				parts: {
					...e.parts,
					[r]: {
						...a,
						relationships: [...h, ...y]
					}
				}
			}, r, N.relationshipIds);
			if (S.issues.length || JSON.stringify(S.partPaths) !== JSON.stringify(i.partPaths)) throw Error("Relocated relationship closure differs");
			return {
				sourceOwner: i.ownerPath,
				destinationOwner: r,
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
		return nc(e, new Map([...o, [a.fragmentXml, {
			signature: a.signature,
			kind: a.objectKind,
			relationshipIds: a.relationshipIds
		}]]));
	}
	async function nc(e, t) {
		e = Wl(e);
		const r = new w.default(), n = Sl(e), o = {
			authorizedOpaqueFragments: t,
			nextImageId: 1,
			nextTextBoxDocPrId: 1000001
		}, i = Oe(e), a = function(e) {
			const t = e.design?.watermark;
			if ("image" !== t?.kind || !t.src) return;
			const r = Pe(e, t.src).match(/^data:([^;,]+);base64,(.*)$/);
			if (!r) return;
			const n = wt(r[1]);
			return n ? {
				rId: "rIdWatermark",
				runId: "__watermark",
				kind: "embedded",
				target: `media/watermark.${n}`,
				base64: r[2],
				cx: 1,
				cy: 1
			} : void 0;
		}(e), s = tl(e), l = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const r of e) t.set(r.footnoteId, r.docxId);
			return t;
		}(s), c = s.length > 0, u = ol(e), d = function(e) {
			const t = /* @__PURE__ */ new Map();
			for (const r of e) t.set(r.endnoteId, r.docxId);
			return t;
		}(u), p = u.length > 0, f = function(e) {
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
		}(e), h = function(e) {
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
		}(e), m = (e) => (e.footnoteIdMap = l, e.endnoteIdMap = d, e.bookmarkEventsByParagraph = f, e.commentEventsByParagraph = h?.eventsByParagraph, e), g = m(ec(i.flatMap((e) => e.blocks), n, o, e)), b = void 0 !== h, v = [], y = i.map(() => ({}));
		let x = 1, E = 1;
		i.forEach((t, r) => {
			const i = (t, i, s) => {
				if (!(s && 0 !== s.length || "header" === t && "text" === e.design?.watermark?.kind || "header" === t && void 0 !== a)) return;
				const l = s ?? [], c = "header" === t ? x : E, u = `${t}${c}.xml`, d = `rId${"header" === t ? "Header" : "Footer"}${c}`, p = m(ec(l, n, o, e));
				"header" === t && a && p.images.push({ ...a }), v.push({
					kind: t,
					type: i,
					path: u,
					relId: d,
					blocks: l,
					context: p
				});
				const f = "header" === t ? "header" : "footer";
				(y[r][f] ??= {})[i] = { relId: d }, "header" === t ? x += 1 : E += 1;
			};
			i("header", "first", t.firstPageHeader), i("header", "even", t.evenPageHeader), i("header", "default", t.header), i("footer", "first", t.firstPageFooter), i("footer", "even", t.evenPageFooter), i("footer", "default", t.footer);
		});
		const N = n.definitions.length > 0, S = i.some((e) => (e.evenPageHeader?.length ?? 0) > 0 || (e.evenPageFooter?.length ?? 0) > 0), k = S || void 0 !== e.settings?.defaultTabStop || void 0 !== e.settings?.allowSpaceOfSameStyleInTable || void 0 !== e.settings?.autoHyphenation || void 0 !== e.settings?.consecutiveHyphenLimit || void 0 !== e.settings?.hyphenationZone || void 0 !== e.settings?.doNotHyphenateCaps || void 0 !== e.footnotes?.settings || void 0 !== e.endnotes?.settings || void 0 !== e.documentVariables && Object.keys(e.documentVariables).length > 0, T = [...g.images, ...v.flatMap((e) => e.context.images)], I = c ? function(e, t, r, n, o, i, a) {
			const s = o(t.flatMap((e) => rl(e.footnote.blocks)));
			s.footnoteIdMap = a;
			const l = t.map((e) => {
				const t = Js(rl(e.footnote.blocks), s, i);
				return `<w:footnote w:id="${e.docxId}">${t}</w:footnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${qt}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${l}</w:footnotes>`,
				partContext: s
			};
		}(0, s, 0, 0, (t) => ec(t, n, o, e), e.styles, l) : null;
		I && T.push(...I.partContext.images);
		const _ = p ? function(e, t, r, n, o, i, a) {
			const s = o(t.flatMap((e) => il(e.endnote.blocks)));
			s.endnoteIdMap = a;
			const l = t.map((e) => {
				const t = Js(il(e.endnote.blocks), s, i);
				return `<w:endnote w:id="${e.docxId}">${t}</w:endnote>`;
			}).join("");
			return {
				xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:endnotes xmlns:w="${Ht}" xmlns:w14="${Wt}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${qt}"><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote><w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>${l}</w:endnotes>`,
				partContext: s
			};
		}(0, u, 0, 0, (t) => ec(t, n, o, e), e.styles, d) : null;
		_ && T.push(..._.partContext.images);
		const C = T.filter((e) => "embedded" === e.kind).map((e) => e.target.split(".").pop()?.toLowerCase()).filter((e) => Boolean(e)), A = null != e.styles && Object.keys(e.styles).length > 0, R = (e.fontTable?.length ?? 0) > 0, D = void 0 !== e.design;
		r.file("[Content_Types].xml", fl(N, C, k, v, c, p, A, b, R, D)), r.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${jt}"><Relationship Id="rId1" Type="${qt}/officeDocument" Target="word/document.xml"/></Relationships>`), r.file("word/document.xml", Il(e, g, y)), A && r.file("word/styles.xml", function(e) {
			const t = Object.values(e).map(pl).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="${Wt}">${t}</w:styles>`;
		}(e.styles)), N && r.file("word/numbering.xml", function(e) {
			const t = e.map(({ abstractNumId: e, levels: t }) => `<w:abstractNum w:abstractNumId="${e}">${t.sort((e, t) => e.level - t.level).map(({ kind: e, level: t, format: r, startAt: n, levelText: o, suffix: i, alignment: a, legal: s, bulletGlyph: l, bulletFont: c, ooxml: u }) => {
				const d = "bullet" === e ? "bullet" : u?.format ?? r ?? "decimal", p = o ?? ("bullet" === e ? l ?? "" : `%${t + 1}.`), f = n ?? 1, h = "bullet" === e ? c ?? "Symbol" : void 0, m = h ? `<w:rPr><w:rFonts w:ascii="${Vt(h)}" w:hAnsi="${Vt(h)}" w:hint="default"/></w:rPr>` : "", g = i && "tab" !== i ? `<w:suff w:val="${i}"/>` : "", w = s ? "<w:isLgl/>" : "", b = void 0 !== u?.restartAfterLevel ? `<w:lvlRestart w:val="${u.restartAfterLevel}"/>` : "", v = u?.paragraphStyleId ? `<w:pStyle w:val="${Vt(u.paragraphStyleId)}"/>` : "";
				return `<w:lvl w:ilvl="${t}"><w:start w:val="${f}"/><w:numFmt w:val="${Vt(d)}"/>${b}${v}<w:lvlText w:val="${Vt(p)}"/><w:lvlJc w:val="${a ?? "left"}"/>${g}${w}${m}</w:lvl>`;
			}).join("")}</w:abstractNum>`).join(""), r = e.map(({ abstractNumId: e, numId: t }) => `<w:num w:numId="${t}"><w:abstractNumId w:val="${e}"/></w:num>`).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${Ht}">${t}${r}</w:numbering>`;
		}(n.definitions)), (A || N || k || g.images.length > 0 || g.hyperlinks.length > 0 || v.length > 0 || c || p || b || R || D) && r.file("word/_rels/document.xml.rels", function(e, t, r, n, o, i, a, s, l, c, u = !1) {
			let d = "";
			s && (d += `<Relationship Id="rIdStyles" Type="${qt}/styles" Target="styles.xml"/>`), e && (d += `<Relationship Id="rIdNum" Type="${qt}/numbering" Target="numbering.xml"/>`), t && (d += `<Relationship Id="rIdSettings" Type="${qt}/settings" Target="settings.xml"/>`);
			for (const p of n) d += `<Relationship Id="${p.rId}" Type="${qt}/hyperlink" Target="${Vt(p.href)}" TargetMode="External"/>`;
			for (const p of r) {
				const e = "linked" === p.kind ? " TargetMode=\"External\"" : "";
				d += `<Relationship Id="${p.rId}" Type="${qt}/image" Target="${Vt(p.target)}"${e}/>`;
			}
			for (const p of o) {
				const e = "header" === p.kind ? "header" : "footer";
				d += `<Relationship Id="${p.relId}" Type="${qt}/${e}" Target="${p.path}"/>`;
			}
			return i && (d += `<Relationship Id="rIdFootnotes" Type="${qt}/footnotes" Target="footnotes.xml"/>`), a && (d += `<Relationship Id="rIdEndnotes" Type="${qt}/endnotes" Target="endnotes.xml"/>`), l && (d += `<Relationship Id="rIdComments" Type="${qt}/comments" Target="comments.xml"/>`, d += "<Relationship Id=\"rIdCommentsExtended\" Type=\"http://schemas.microsoft.com/office/2011/relationships/commentsExtended\" Target=\"commentsExtended.xml\"/>"), c && (d += `<Relationship Id="rIdFontTable" Type="${qt}/fontTable" Target="fontTable.xml"/>`), u && (d += `<Relationship Id="rIdTheme" Type="${qt}/theme" Target="theme/theme1.xml"/>`), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${jt}">${d}</Relationships>`;
		}(N, k, g.images, g.hyperlinks, v, c, p, A, b, R, D)), R && r.file("word/fontTable.xml", function(e) {
			const t = e.map((e) => {
				const t = [];
				if (e.altName && t.push(`<w:altName w:val="${Vt(e.altName)}"/>`), e.panose1 && t.push(`<w:panose1 w:val="${Vt(e.panose1)}"/>`), e.charset && t.push(`<w:charset w:val="${Vt(e.charset)}"/>`), e.family && t.push(`<w:family w:val="${Vt(e.family)}"/>`), e.pitch && t.push(`<w:pitch w:val="${Vt(e.pitch)}"/>`), e.sig) {
					const r = Object.entries(e.sig).map(([e, t]) => `w:${e}="${Vt(t)}"`).join(" ");
					r && t.push(`<w:sig ${r}/>`);
				}
				return `<w:font w:name="${Vt(e.name)}">${t.join("")}</w:font>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="${Ht}">${t}</w:fonts>`;
		}(e.fontTable)), D && r.file("word/theme/theme1.xml", function(e) {
			const t = e?.themeData?.sourceXml;
			if (t) return t;
			const r = Vl[e?.themeId ?? "oasis"] ?? Vl.oasis, n = e?.themeData, o = (e, t) => (n?.colors?.[e] ?? t).replace(/^#/, "").toUpperCase(), i = {
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
			}, a = Object.entries(i).map(([e, t]) => `<a:${e}><a:srgbClr val="${t}"/></a:${e}>`).join(""), s = (e, t, r) => Vt(n?.fonts?.[e]?.[t] ?? r), l = Vt(n?.name ?? `${(e?.themeId ?? "oasis")[0].toUpperCase()}${(e?.themeId ?? "oasis").slice(1)}`), c = n?.effectsXml ?? "<a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/>";
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${l}"><a:themeElements><a:clrScheme name="${l}">${a}</a:clrScheme><a:fontScheme name="${l}"><a:majorFont><a:latin typeface="${s("major", "majorHAnsi", "Aptos Display")}"/><a:ea typeface="${s("major", "majorEastAsia", "Aptos Display")}"/><a:cs typeface="${s("major", "majorBidi", "Aptos Display")}"/></a:majorFont><a:minorFont><a:latin typeface="${s("minor", "minorHAnsi", "Aptos")}"/><a:ea typeface="${s("minor", "minorEastAsia", "Aptos")}"/><a:cs typeface="${s("minor", "minorBidi", "Aptos")}"/></a:minorFont></a:fontScheme><a:fmtScheme name="${l}">${c}</a:fmtScheme></a:themeElements></a:theme>`;
		}(e.design)), k && r.file("word/settings.xml", wl(S, e.settings?.defaultTabStop, e.footnotes?.settings, e.endnotes?.settings, e.settings?.allowSpaceOfSameStyleInTable, {
			autoHyphenation: e.settings?.autoHyphenation,
			consecutiveHyphenLimit: e.settings?.consecutiveHyphenLimit,
			hyphenationZone: e.settings?.hyphenationZone,
			doNotHyphenateCaps: e.settings?.doNotHyphenateCaps
		}, e.documentVariables));
		for (const w of v) r.file(`word/${w.path}`, _l(w.kind, w.blocks, w.context, e.styles, e.design?.watermark)), (w.context.images.length > 0 || w.context.hyperlinks.length > 0) && r.file(`word/_rels/${w.path}.rels`, bl(w.context.images, w.context.hyperlinks));
		tc(r, "footnotes", I), tc(r, "endnotes", _), h && (r.file("word/comments.xml", Si(h)), r.file("word/commentsExtended.xml", function(e) {
			const t = new Map(e.comments.map(({ comment: e, paraId: t }) => [e.id, t])), r = e.comments.map(({ comment: e, paraId: r }) => {
				const n = e.parentId ? t.get(e.parentId) : void 0;
				return `<w15:commentEx w15:paraId="${r}"${n ? ` w15:paraIdParent="${n}"` : ""} w15:done="${e.resolved ? "1" : "0"}"/>`;
			}).join("");
			return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w15:commentsEx ${Ni}>${r}</w15:commentsEx>`;
		}(h)));
		for (const w of T) "embedded" === w.kind && w.base64 && r.file(`word/${w.target}`, w.base64, { base64: !0 });
		return r.generateAsync({ type: "arraybuffer" });
	}
	function oc(e) {
		let t = 2166136261;
		for (const r of e) t ^= r, t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	async function ic(e, t) {
		return async function(e) {
			const t = await w.default.loadAsync(e), r = {};
			for (const [n, o] of Object.entries(t.files)) o.dir || (r[x(n)] = oc(await o.async("uint8array")));
			return r;
		}(await rc(e, t));
	}
	const ac = "word/document.xml";
	function sc(e) {
		let t = 2166136261;
		for (let r = 0; r < e.length; r += 1) t ^= e.charCodeAt(r), t = Math.imul(t, 16777619);
		return (t >>> 0).toString(16).padStart(8, "0");
	}
	function lc(e, t) {
		const r = t.overrides[e];
		if (r) return r;
		const n = e.includes(".") ? e.slice(e.lastIndexOf(".") + 1).toLowerCase() : "";
		return t.defaults[n];
	}
	function cc(e, t) {
		return !(!e.endsWith(".xml") && !e.endsWith(".rels")) || "application/xml" === t || Boolean(t?.endsWith("+xml"));
	}
	async function uc(e) {
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
					e && r && (t.overrides[x(e)] = r);
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
		for (const [u, d] of Object.entries(t.files)) {
			if (d.dir) continue;
			const e = x(u), t = lc(e, o), r = cc(e, t) ? "xml" : "binary", n = "xml" === r ? await d.async("string") : await d.async("base64");
			i[e] = {
				path: e,
				...t ? { contentType: t } : {},
				kind: r,
				data: n,
				encoding: "xml" === r ? "utf8" : "base64",
				originalHash: sc(n)
			};
		}
		let a = [];
		for (const [u, d] of Object.entries(i)) {
			const e = N(u);
			if (void 0 === e || "xml" !== d.kind) continue;
			const t = T(e, S(d.data), (t) => {
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
				message: `Relationship part ${u} has no owning package part.`,
				partPath: u
			});
		}
		let s = a.find((e) => "External" !== e.targetMode && e.type.endsWith("/officeDocument"))?.resolvedTarget;
		if (!s || !i[s]) {
			if (!i[ac]) throw new Error("DOCX package has no resolvable officeDocument relationship or word/document.xml fallback.");
			s = ac, r.push({
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
			...r.length > 0 ? { diagnostics: r } : {}
		}, c = xn(l);
		return c.objects.length && (l.opaqueObjects = c.objects), c.diagnostics.length && (l.diagnostics = [...r, ...c.diagnostics]), l;
	}
	const dc = "word/document.xml", pc = {
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
	function fc(e) {
		const t = e.lastIndexOf("/"), r = t >= 0 ? e.slice(0, t) : "", n = t >= 0 ? e.slice(t + 1) : e;
		return r ? `${r}/_rels/${n}.rels` : `_rels/${n}.rels`;
	}
	function hc(e, t, r) {
		"base64" === r.encoding ? e.file(t, r.data, { base64: !0 }) : e.file(t, r.data);
	}
	function mc(e) {
		return `word/__oasis_source__/${e}`;
	}
	function gc(e) {
		return e ? e.map((e) => "External" !== e.targetMode && e.resolvedTarget ? {
			...e,
			target: `/${mc(e.resolvedTarget)}`,
			resolvedTarget: void 0
		} : e) : [];
	}
	function wc(e) {
		for (const [t, r] of Object.entries(pc)) if (e.type.endsWith(t)) return r;
	}
	async function bc(e, t) {
		if (!function(e) {
			if (e.mainDocumentPart !== dc) return !0;
			const t = e.parts[e.mainDocumentPart];
			return Boolean(t?.relationships?.some((e) => {
				const t = wc(e);
				return Boolean(t && e.resolvedTarget && e.resolvedTarget !== t);
			}));
		}(t)) return e;
		const r = new w.default();
		for (const i of Object.values(t.parts)) hc(r, i.path, i);
		for (const i of Object.values(t.parts)) {
			if (i.path.endsWith(".rels") || "[Content_Types].xml" === i.path) continue;
			const e = mc(i.path);
			hc(r, e, i);
			const t = gc(i.relationships);
			t.length > 0 && r.file(fc(e), k(t));
		}
		const n = t.parts[t.mainDocumentPart];
		if (!n) throw new Error(`DOCX source package is missing its main part: ${t.mainDocumentPart}`);
		hc(r, dc, n);
		const o = gc(n.relationships);
		o.length > 0 && r.file(fc(dc), k(o));
		for (const i of n.relationships ?? []) {
			if ("External" === i.targetMode || !i.resolvedTarget) continue;
			const e = wc(i), n = t.parts[i.resolvedTarget];
			if (!e || !n) continue;
			hc(r, e, n);
			const o = gc(n.relationships);
			o.length > 0 && r.file(fc(e), k(o));
		}
		return r.generateAsync({ type: "arraybuffer" });
	}
	function vc(e) {
		globalThis.postMessage(e);
	}
	globalThis.addEventListener("message", async (e) => {
		const t = e.data;
		if ("import-docx" === t?.type) try {
			const e = await uc(t.buffer), n = await vi(await bc(t.buffer, e), { onProgress: (e, r) => {
				vc({
					type: "progress",
					id: t.id,
					stage: e,
					progress: r
				});
			} });
			await async function(e, t) {
				try {
					t.rebuiltPartHashes = await ic(e, t);
				} catch (r) {
					(t.diagnostics ??= []).push({
						level: "warning",
						code: "rebuilt-baseline-unavailable",
						message: `The imported document could not be fingerprinted for granular source-part preservation: ${r instanceof Error ? r.message : String(r)}`
					});
				}
			}(n, e), n.sourcePackage = e, vc({
				type: "done",
				id: t.id,
				document: n
			});
		} catch (r) {
			vc({
				type: "error",
				id: t.id,
				error: r instanceof Error ? r.message : String(r)
			});
		}
	});
})();
