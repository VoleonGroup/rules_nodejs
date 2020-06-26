!function(e){var r={};function t(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,t),o.l=!0,o.exports}t.m=e,t.c=r,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:n})},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.t=function(e,r){if(1&r&&(e=t(e)),8&r)return e;if(4&r&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(t.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&r&&"string"!=typeof e)for(var o in e)t.d(n,o,function(r){return e[r]}.bind(null,o));return n},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},t.p="",t(t.s=5)}([function(e,r){e.exports=require("fs")},function(e,r){e.exports=require("path")},function(e,r){e.exports=require("process")},function(e,r){var t;r=e.exports=U,t="object"==typeof process&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG)?function(){var e=Array.prototype.slice.call(arguments,0);e.unshift("SEMVER"),console.log.apply(console,e)}:function(){},r.SEMVER_SPEC_VERSION="2.0.0";var n=Number.MAX_SAFE_INTEGER||9007199254740991,o=r.re=[],i=r.src=[],a=0,s=a++;i[s]="0|[1-9]\\d*";var u=a++;i[u]="[0-9]+";var c=a++;i[c]="\\d*[a-zA-Z-][a-zA-Z0-9-]*";var p=a++;i[p]="("+i[s]+")\\.("+i[s]+")\\.("+i[s]+")";var l=a++;i[l]="("+i[u]+")\\.("+i[u]+")\\.("+i[u]+")";var f=a++;i[f]="(?:"+i[s]+"|"+i[c]+")";var h=a++;i[h]="(?:"+i[u]+"|"+i[c]+")";var v=a++;i[v]="(?:-("+i[f]+"(?:\\."+i[f]+")*))";var m=a++;i[m]="(?:-?("+i[h]+"(?:\\."+i[h]+")*))";var d=a++;i[d]="[0-9A-Za-z-]+";var _=a++;i[_]="(?:\\+("+i[d]+"(?:\\."+i[d]+")*))";var g=a++,y="v?"+i[p]+i[v]+"?"+i[_]+"?";i[g]="^"+y+"$";var w="[v=\\s]*"+i[l]+i[m]+"?"+i[_]+"?",b=a++;i[b]="^"+w+"$";var j=a++;i[j]="((?:<|>)?=?)";var k=a++;i[k]=i[u]+"|x|X|\\*";var E=a++;i[E]=i[s]+"|x|X|\\*";var q=a++;i[q]="[v=\\s]*("+i[E]+")(?:\\.("+i[E]+")(?:\\.("+i[E]+")(?:"+i[v]+")?"+i[_]+"?)?)?";var S=a++;i[S]="[v=\\s]*("+i[k]+")(?:\\.("+i[k]+")(?:\\.("+i[k]+")(?:"+i[m]+")?"+i[_]+"?)?)?";var x=a++;i[x]="^"+i[j]+"\\s*"+i[q]+"$";var P=a++;i[P]="^"+i[j]+"\\s*"+i[S]+"$";var N=a++;i[N]="(?:^|[^\\d])(\\d{1,16})(?:\\.(\\d{1,16}))?(?:\\.(\\d{1,16}))?(?:$|[^\\d])";var $=a++;i[$]="(?:~>?)";var O=a++;i[O]="(\\s*)"+i[$]+"\\s+",o[O]=new RegExp(i[O],"g");var R=a++;i[R]="^"+i[$]+i[q]+"$";var T=a++;i[T]="^"+i[$]+i[S]+"$";var I=a++;i[I]="(?:\\^)";var A=a++;i[A]="(\\s*)"+i[I]+"\\s+",o[A]=new RegExp(i[A],"g");var C=a++;i[C]="^"+i[I]+i[q]+"$";var M=a++;i[M]="^"+i[I]+i[S]+"$";var D=a++;i[D]="^"+i[j]+"\\s*("+w+")$|^$";var V=a++;i[V]="^"+i[j]+"\\s*("+y+")$|^$";var z=a++;i[z]="(\\s*)"+i[j]+"\\s*("+w+"|"+i[q]+")",o[z]=new RegExp(i[z],"g");var G=a++;i[G]="^\\s*("+i[q]+")\\s+-\\s+("+i[q]+")\\s*$";var B=a++;i[B]="^\\s*("+i[S]+")\\s+-\\s+("+i[S]+")\\s*$";var L=a++;i[L]="(<|>)?=?\\s*\\*";for(var X=0;X<35;X++)t(X,i[X]),o[X]||(o[X]=new RegExp(i[X]));function F(e,r){if(r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1}),e instanceof U)return e;if("string"!=typeof e)return null;if(e.length>256)return null;if(!(r.loose?o[b]:o[g]).test(e))return null;try{return new U(e,r)}catch(e){return null}}function U(e,r){if(r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1}),e instanceof U){if(e.loose===r.loose)return e;e=e.version}else if("string"!=typeof e)throw new TypeError("Invalid Version: "+e);if(e.length>256)throw new TypeError("version is longer than 256 characters");if(!(this instanceof U))return new U(e,r);t("SemVer",e,r),this.options=r,this.loose=!!r.loose;var i=e.trim().match(r.loose?o[b]:o[g]);if(!i)throw new TypeError("Invalid Version: "+e);if(this.raw=e,this.major=+i[1],this.minor=+i[2],this.patch=+i[3],this.major>n||this.major<0)throw new TypeError("Invalid major version");if(this.minor>n||this.minor<0)throw new TypeError("Invalid minor version");if(this.patch>n||this.patch<0)throw new TypeError("Invalid patch version");i[4]?this.prerelease=i[4].split(".").map((function(e){if(/^[0-9]+$/.test(e)){var r=+e;if(r>=0&&r<n)return r}return e})):this.prerelease=[],this.build=i[5]?i[5].split("."):[],this.format()}r.parse=F,r.valid=function(e,r){var t=F(e,r);return t?t.version:null},r.clean=function(e,r){var t=F(e.trim().replace(/^[=v]+/,""),r);return t?t.version:null},r.SemVer=U,U.prototype.format=function(){return this.version=this.major+"."+this.minor+"."+this.patch,this.prerelease.length&&(this.version+="-"+this.prerelease.join(".")),this.version},U.prototype.toString=function(){return this.version},U.prototype.compare=function(e){return t("SemVer.compare",this.version,this.options,e),e instanceof U||(e=new U(e,this.options)),this.compareMain(e)||this.comparePre(e)},U.prototype.compareMain=function(e){return e instanceof U||(e=new U(e,this.options)),H(this.major,e.major)||H(this.minor,e.minor)||H(this.patch,e.patch)},U.prototype.comparePre=function(e){if(e instanceof U||(e=new U(e,this.options)),this.prerelease.length&&!e.prerelease.length)return-1;if(!this.prerelease.length&&e.prerelease.length)return 1;if(!this.prerelease.length&&!e.prerelease.length)return 0;var r=0;do{var n=this.prerelease[r],o=e.prerelease[r];if(t("prerelease compare",r,n,o),void 0===n&&void 0===o)return 0;if(void 0===o)return 1;if(void 0===n)return-1;if(n!==o)return H(n,o)}while(++r)},U.prototype.inc=function(e,r){switch(e){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",r);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",r);break;case"prepatch":this.prerelease.length=0,this.inc("patch",r),this.inc("pre",r);break;case"prerelease":0===this.prerelease.length&&this.inc("patch",r),this.inc("pre",r);break;case"major":0===this.minor&&0===this.patch&&0!==this.prerelease.length||this.major++,this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":0===this.patch&&0!==this.prerelease.length||this.minor++,this.patch=0,this.prerelease=[];break;case"patch":0===this.prerelease.length&&this.patch++,this.prerelease=[];break;case"pre":if(0===this.prerelease.length)this.prerelease=[0];else{for(var t=this.prerelease.length;--t>=0;)"number"==typeof this.prerelease[t]&&(this.prerelease[t]++,t=-2);-1===t&&this.prerelease.push(0)}r&&(this.prerelease[0]===r?isNaN(this.prerelease[1])&&(this.prerelease=[r,0]):this.prerelease=[r,0]);break;default:throw new Error("invalid increment argument: "+e)}return this.format(),this.raw=this.version,this},r.inc=function(e,r,t,n){"string"==typeof t&&(n=t,t=void 0);try{return new U(e,t).inc(r,n).version}catch(e){return null}},r.diff=function(e,r){if(W(e,r))return null;var t=F(e),n=F(r);if(t.prerelease.length||n.prerelease.length){for(var o in t)if(("major"===o||"minor"===o||"patch"===o)&&t[o]!==n[o])return"pre"+o;return"prerelease"}for(var o in t)if(("major"===o||"minor"===o||"patch"===o)&&t[o]!==n[o])return o},r.compareIdentifiers=H;var Z=/^[0-9]+$/;function H(e,r){var t=Z.test(e),n=Z.test(r);return t&&n&&(e=+e,r=+r),t&&!n?-1:n&&!t?1:e<r?-1:e>r?1:0}function J(e,r,t){return new U(e,t).compare(new U(r,t))}function K(e,r,t){return J(e,r,t)>0}function Q(e,r,t){return J(e,r,t)<0}function W(e,r,t){return 0===J(e,r,t)}function Y(e,r,t){return 0!==J(e,r,t)}function ee(e,r,t){return J(e,r,t)>=0}function re(e,r,t){return J(e,r,t)<=0}function te(e,r,t,n){var o;switch(r){case"===":"object"==typeof e&&(e=e.version),"object"==typeof t&&(t=t.version),o=e===t;break;case"!==":"object"==typeof e&&(e=e.version),"object"==typeof t&&(t=t.version),o=e!==t;break;case"":case"=":case"==":o=W(e,t,n);break;case"!=":o=Y(e,t,n);break;case">":o=K(e,t,n);break;case">=":o=ee(e,t,n);break;case"<":o=Q(e,t,n);break;case"<=":o=re(e,t,n);break;default:throw new TypeError("Invalid operator: "+r)}return o}function ne(e,r){if(r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1}),e instanceof ne){if(e.loose===!!r.loose)return e;e=e.value}if(!(this instanceof ne))return new ne(e,r);t("comparator",e,r),this.options=r,this.loose=!!r.loose,this.parse(e),this.semver===oe?this.value="":this.value=this.operator+this.semver.version,t("comp",this)}r.rcompareIdentifiers=function(e,r){return H(r,e)},r.major=function(e,r){return new U(e,r).major},r.minor=function(e,r){return new U(e,r).minor},r.patch=function(e,r){return new U(e,r).patch},r.compare=J,r.compareLoose=function(e,r){return J(e,r,!0)},r.rcompare=function(e,r,t){return J(r,e,t)},r.sort=function(e,t){return e.sort((function(e,n){return r.compare(e,n,t)}))},r.rsort=function(e,t){return e.sort((function(e,n){return r.rcompare(e,n,t)}))},r.gt=K,r.lt=Q,r.eq=W,r.neq=Y,r.gte=ee,r.lte=re,r.cmp=te,r.Comparator=ne;var oe={};function ie(e,r){if(r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1}),e instanceof ie)return e.loose===!!r.loose&&e.includePrerelease===!!r.includePrerelease?e:new ie(e.raw,r);if(e instanceof ne)return new ie(e.value,r);if(!(this instanceof ie))return new ie(e,r);if(this.options=r,this.loose=!!r.loose,this.includePrerelease=!!r.includePrerelease,this.raw=e,this.set=e.split(/\s*\|\|\s*/).map((function(e){return this.parseRange(e.trim())}),this).filter((function(e){return e.length})),!this.set.length)throw new TypeError("Invalid SemVer Range: "+e);this.format()}function ae(e){return!e||"x"===e.toLowerCase()||"*"===e}function se(e,r,t,n,o,i,a,s,u,c,p,l,f){return((r=ae(t)?"":ae(n)?">="+t+".0.0":ae(o)?">="+t+"."+n+".0":">="+r)+" "+(s=ae(u)?"":ae(c)?"<"+(+u+1)+".0.0":ae(p)?"<"+u+"."+(+c+1)+".0":l?"<="+u+"."+c+"."+p+"-"+l:"<="+s)).trim()}function ue(e,r,n){for(var o=0;o<e.length;o++)if(!e[o].test(r))return!1;if(n||(n={}),r.prerelease.length&&!n.includePrerelease){for(o=0;o<e.length;o++)if(t(e[o].semver),e[o].semver!==oe&&e[o].semver.prerelease.length>0){var i=e[o].semver;if(i.major===r.major&&i.minor===r.minor&&i.patch===r.patch)return!0}return!1}return!0}function ce(e,r,t){try{r=new ie(r,t)}catch(e){return!1}return r.test(e)}function pe(e,r,t,n){var o,i,a,s,u;switch(e=new U(e,n),r=new ie(r,n),t){case">":o=K,i=re,a=Q,s=">",u=">=";break;case"<":o=Q,i=ee,a=K,s="<",u="<=";break;default:throw new TypeError('Must provide a hilo val of "<" or ">"')}if(ce(e,r,n))return!1;for(var c=0;c<r.set.length;++c){var p=r.set[c],l=null,f=null;if(p.forEach((function(e){e.semver===oe&&(e=new ne(">=0.0.0")),l=l||e,f=f||e,o(e.semver,l.semver,n)?l=e:a(e.semver,f.semver,n)&&(f=e)})),l.operator===s||l.operator===u)return!1;if((!f.operator||f.operator===s)&&i(e,f.semver))return!1;if(f.operator===u&&a(e,f.semver))return!1}return!0}ne.prototype.parse=function(e){var r=this.options.loose?o[D]:o[V],t=e.match(r);if(!t)throw new TypeError("Invalid comparator: "+e);this.operator=t[1],"="===this.operator&&(this.operator=""),t[2]?this.semver=new U(t[2],this.options.loose):this.semver=oe},ne.prototype.toString=function(){return this.value},ne.prototype.test=function(e){return t("Comparator.test",e,this.options.loose),this.semver===oe||("string"==typeof e&&(e=new U(e,this.options)),te(e,this.operator,this.semver,this.options))},ne.prototype.intersects=function(e,r){if(!(e instanceof ne))throw new TypeError("a Comparator is required");var t;if(r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1}),""===this.operator)return t=new ie(e.value,r),ce(this.value,t,r);if(""===e.operator)return t=new ie(this.value,r),ce(e.semver,t,r);var n=!(">="!==this.operator&&">"!==this.operator||">="!==e.operator&&">"!==e.operator),o=!("<="!==this.operator&&"<"!==this.operator||"<="!==e.operator&&"<"!==e.operator),i=this.semver.version===e.semver.version,a=!(">="!==this.operator&&"<="!==this.operator||">="!==e.operator&&"<="!==e.operator),s=te(this.semver,"<",e.semver,r)&&(">="===this.operator||">"===this.operator)&&("<="===e.operator||"<"===e.operator),u=te(this.semver,">",e.semver,r)&&("<="===this.operator||"<"===this.operator)&&(">="===e.operator||">"===e.operator);return n||o||i&&a||s||u},r.Range=ie,ie.prototype.format=function(){return this.range=this.set.map((function(e){return e.join(" ").trim()})).join("||").trim(),this.range},ie.prototype.toString=function(){return this.range},ie.prototype.parseRange=function(e){var r=this.options.loose;e=e.trim();var n=r?o[B]:o[G];e=e.replace(n,se),t("hyphen replace",e),e=e.replace(o[z],"$1$2$3"),t("comparator trim",e,o[z]),e=(e=(e=e.replace(o[O],"$1~")).replace(o[A],"$1^")).split(/\s+/).join(" ");var i=r?o[D]:o[V],a=e.split(" ").map((function(e){return function(e,r){return t("comp",e,r),e=function(e,r){return e.trim().split(/\s+/).map((function(e){return function(e,r){t("caret",e,r),r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1});var n=r.loose?o[M]:o[C];return e.replace(n,(function(r,n,o,i,a){var s;return t("caret",e,r,n,o,i,a),ae(n)?s="":ae(o)?s=">="+n+".0.0 <"+(+n+1)+".0.0":ae(i)?s="0"===n?">="+n+"."+o+".0 <"+n+"."+(+o+1)+".0":">="+n+"."+o+".0 <"+(+n+1)+".0.0":a?(t("replaceCaret pr",a),"-"!==a.charAt(0)&&(a="-"+a),s="0"===n?"0"===o?">="+n+"."+o+"."+i+a+" <"+n+"."+o+"."+(+i+1):">="+n+"."+o+"."+i+a+" <"+n+"."+(+o+1)+".0":">="+n+"."+o+"."+i+a+" <"+(+n+1)+".0.0"):(t("no pr"),s="0"===n?"0"===o?">="+n+"."+o+"."+i+" <"+n+"."+o+"."+(+i+1):">="+n+"."+o+"."+i+" <"+n+"."+(+o+1)+".0":">="+n+"."+o+"."+i+" <"+(+n+1)+".0.0"),t("caret return",s),s}))}(e,r)})).join(" ")}(e,r),t("caret",e),e=function(e,r){return e.trim().split(/\s+/).map((function(e){return function(e,r){r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1});var n=r.loose?o[T]:o[R];return e.replace(n,(function(r,n,o,i,a){var s;return t("tilde",e,r,n,o,i,a),ae(n)?s="":ae(o)?s=">="+n+".0.0 <"+(+n+1)+".0.0":ae(i)?s=">="+n+"."+o+".0 <"+n+"."+(+o+1)+".0":a?(t("replaceTilde pr",a),"-"!==a.charAt(0)&&(a="-"+a),s=">="+n+"."+o+"."+i+a+" <"+n+"."+(+o+1)+".0"):s=">="+n+"."+o+"."+i+" <"+n+"."+(+o+1)+".0",t("tilde return",s),s}))}(e,r)})).join(" ")}(e,r),t("tildes",e),e=function(e,r){return t("replaceXRanges",e,r),e.split(/\s+/).map((function(e){return function(e,r){e=e.trim(),r&&"object"==typeof r||(r={loose:!!r,includePrerelease:!1});var n=r.loose?o[P]:o[x];return e.replace(n,(function(r,n,o,i,a,s){t("xRange",e,r,n,o,i,a,s);var u=ae(o),c=u||ae(i),p=c||ae(a);return"="===n&&p&&(n=""),u?r=">"===n||"<"===n?"<0.0.0":"*":n&&p?(c&&(i=0),p&&(a=0),">"===n?(n=">=",c?(o=+o+1,i=0,a=0):p&&(i=+i+1,a=0)):"<="===n&&(n="<",c?o=+o+1:i=+i+1),r=n+o+"."+i+"."+a):c?r=">="+o+".0.0 <"+(+o+1)+".0.0":p&&(r=">="+o+"."+i+".0 <"+o+"."+(+i+1)+".0"),t("xRange return",r),r}))}(e,r)})).join(" ")}(e,r),t("xrange",e),e=function(e,r){return t("replaceStars",e,r),e.trim().replace(o[L],"")}(e,r),t("stars",e),e}(e,this.options)}),this).join(" ").split(/\s+/);return this.options.loose&&(a=a.filter((function(e){return!!e.match(i)}))),a=a.map((function(e){return new ne(e,this.options)}),this)},ie.prototype.intersects=function(e,r){if(!(e instanceof ie))throw new TypeError("a Range is required");return this.set.some((function(t){return t.every((function(t){return e.set.some((function(e){return e.every((function(e){return t.intersects(e,r)}))}))}))}))},r.toComparators=function(e,r){return new ie(e,r).set.map((function(e){return e.map((function(e){return e.value})).join(" ").trim().split(" ")}))},ie.prototype.test=function(e){if(!e)return!1;"string"==typeof e&&(e=new U(e,this.options));for(var r=0;r<this.set.length;r++)if(ue(this.set[r],e,this.options))return!0;return!1},r.satisfies=ce,r.maxSatisfying=function(e,r,t){var n=null,o=null;try{var i=new ie(r,t)}catch(e){return null}return e.forEach((function(e){i.test(e)&&(n&&-1!==o.compare(e)||(o=new U(n=e,t)))})),n},r.minSatisfying=function(e,r,t){var n=null,o=null;try{var i=new ie(r,t)}catch(e){return null}return e.forEach((function(e){i.test(e)&&(n&&1!==o.compare(e)||(o=new U(n=e,t)))})),n},r.validRange=function(e,r){try{return new ie(e,r).range||"*"}catch(e){return null}},r.ltr=function(e,r,t){return pe(e,r,"<",t)},r.gtr=function(e,r,t){return pe(e,r,">",t)},r.outside=pe,r.prerelease=function(e,r){var t=F(e,r);return t&&t.prerelease.length?t.prerelease:null},r.intersects=function(e,r,t){return e=new ie(e,t),r=new ie(r,t),e.intersects(r)},r.coerce=function(e){if(e instanceof U)return e;if("string"!=typeof e)return null;var r=e.match(o[N]);return null==r?null:F((r[1]||"0")+"."+(r[2]||"0")+"."+(r[3]||"0"))}},function(e,r){e.exports=require("console")},function(e,r,t){"use strict";t.r(r),function(e){t.d(r,"main",(function(){return _}));var n=t(0),o=t(1),i=t(2),a=t(3),s=t(4),u=function(e,r){var t="function"==typeof Symbol&&e[Symbol.iterator];if(!t)return e;var n,o,i=t.call(e),a=[];try{for(;(void 0===r||r-- >0)&&!(n=i.next()).done;)a.push(n.value)}catch(e){o={error:e}}finally{try{n&&!n.done&&(t=i.return)&&t.call(i)}finally{if(o)throw o.error}}return a},c=function(){for(var e=[],r=0;r<arguments.length;r++)e=e.concat(u(arguments[r]));return e};function p(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];i.env.VERBOSE_LOGS&&console.error.apply(console,c(["[generate_build_file.ts]"],e))}console.log("Here!!!"),console.log("require.main is "+t.c[t.s]),console.log("module is "+e),console.log("require.main === module is "+(t.c[t.s]===e));var l=i.argv.slice(2),f=l[0],h=l[1];function v(e){return e._name+"@"+e._version}var m=function(){function e(r,t){var n,o=this;p("Creating Depset for "+v(r)+": "+r._repoName),this.parent=r,n=u(e.extractDep(t,r),2),this.depmap=n[0],this.packages=n[1],this.depmap.forEach((function(e){o.parentify(e)})),p("Depset created for "+v(r)+":"),this.depmap.forEach((function(e){p(v(e)+": "+e._repoName)}))}return e.prototype.parentify=function(e){return e._parent=this.parent,e._repoName=g(e),e},e.prototype.add=function(r){this.packages.has(v(r))||(this.packages.add(v(r)),this.depmap.set(v(r),this.parentify(e.clone(r))))},e.prototype.merge=function(e){var r=this;e.depmap.forEach((function(e){r.add(e)}))},e.prototype.depArray=function(){return Array.from(this.depmap.values())},e.clone=function(e){var r={};return r._name=e._name,r._version=e._version,r._integrity=e._integrity,r._resolved=e._resolved,r._dependencies=[],r._required_deps=[],r._parent=null,r},e.extractDep=function(r,t){var n=new Map,o=new Set;r.add(t);var i=(t._required_deps||[]).filter((function(e){return!r.has(e)}));return(i=i.concat((t._required_deps||[]).filter((function(e){return!r.has(e)})))).forEach((function(t){var i,a;i=u(e.extractDep(r,t),2),a=i[0],i[1].forEach((function(e){o.has(e)||(o.add(e),n.set(e,a.get(e)))})),o.add(v(t)),n.set(v(t),e.clone(t))})),r.delete(t),[n,o]},e}();function d(e,r){console.log("writing to "+e),function e(r){n.existsSync(r)||(e(o.dirname(r)),n.mkdirSync(r))}(o.dirname(e)),n.writeFileSync(e,r),console.log("write to "+e+" finished")}function _(){var e,r,t=(e=h,function e(r,t){var n=[],o=t||[];return Object.keys(o).forEach((function(t){var i={},a=o[t];i._name=t,i._parent=r,i._version=a.version,i._resolved=a.resolved,i._integrity=a.integrity,i._requires=a.requires,i._dependencies=e(i,a.dependencies),i._repoName=g(i),i.dependencies=a.dependencies,i.requires=a.requires,n.push(i)})),n}(null,JSON.parse((r=n.readFileSync(e,{encoding:"utf8"}),65279===r.charCodeAt(0)?r.slice(1):r)).dependencies)),o=new Map;t.forEach((function(e){Object(s.assert)(!o.has(e._name),e._name+" already exists!"),o.set(e._name,[e])})),function e(r,t){t.forEach((function(t){var n=function e(r){return r&&r._parent?new Set(c([r._parent],e(r._parent))):new Set}(t);t._required_deps=[],Object.keys(t._requires||{}).sort().forEach((function(e){var o=t._requires[e];if(r.has(e)){var i=r.get(e).filter((function(e){return a.satisfies(e._version,o)})).filter((function(e){return!n.has(e)}));if(i.length>0)return void t._required_deps.push(i[0])}var u=t._dependencies.filter((function(r){return r._name==e&&a.satisfies(r._version,o)}));Object(s.assert)(u.length>0,"Can't resolve "+e+"@"+o+", required by "+v(t))})),t._dependencies.forEach((function(e){r.has(e._name)?r.get(e._name).push(e):r.set(e._name,[e])})),e(r,t._dependencies.sort()),t._dependencies.forEach((function(e){r.get(e._name).pop()}))}))}(o,t),t.forEach((function(e){!function e(r,t){r.push(t),t._required_deps.forEach((function(n){for(var o=0;n._required_deps&&o<n._required_deps.length;o++)if(r.includes(n._required_deps[o])){p("Cycle found: "+t._repoName+" requires "+n._repoName+", which requires "+n._required_deps[o]._repoName);var i=new m(n,new Set(r));n._required_deps=[],n._dependencies=i.depArray();break}n._required_deps&&n._required_deps.length>0&&e(r,n)})),r.pop()}([],e)})),d("packages.bzl",function(e){var r=e.map((function(e){return function e(r){p("printing "+v(r));var t=r._required_deps.map((function(e){return e._repoName+"//:pkg"})),n=r._dependencies.map((function(e){return e._repoName+"//:pkg"})),o=t.concat(n);return'\n  if "'+r._repoName+'" not in native.existing_rules():\n    install_package(\n      name = "'+r._repoName+'",\n      pkg = "'+r._name+'",\n      version = "'+r._version+'",\n      integrity = "'+r._integrity+'",\n      url = "'+r._resolved+'",\n      required_targets = ['+o.map((function(e){return'"@'+e+'"'})).join(",")+"],\n      **kwargs\n    )\n"+r._dependencies.map((function(r){return e(r)})).join("")}(e)})),t=e.map((function(e){return'"'+e._name+'": "'+e._repoName+'//:pkg"'}));return' # Generated by npm_repositories rule\nload("@build_bazel_rules_nodejs//internal/npm_install:npm_repository.bzl", "install_package")\n\ndef install_packages(**kwargs):\n  '+r.join("\n")+"\n\n_packages = {\n  "+t.join(",")+'\n}\n\nall_packages = _packages.values()\n\ndef _require(name, target=None):\n  name_key = name.lower()\n  if name_key not in _packages:\n    fail("Could not find npm-provided dependency: \'%s\'" % name)\n  req = _packages[name_key]\n  pkg, _, _ = req.partition("//")\n  if target != None:\n    req = pkg + target\n  return req, pkg\n\ndef require(name, target=None):\n  req, _ = _require(name, target)\n  return req\n\ndef repo(name):\n  _, pkg = _require(name)\n  return pkg\n'}(t)),d(".bazelignore","node_modules"),d("BUILD","")}function g(e){function r(e){return e._name.replace(/\@/g,"_at_").replace(/\'/g,"_quote_").replace(/\//g,"_slash_")+"__"+e._version.replace(/\./g,"_")}var t=function e(t){return t._parent?e(t._parent).concat(r(t._parent)):[]}(e).join("__");return t.length?f+"__"+t+"__"+r(e):f+"__"+r(e)}_()}.call(this,t(6)(e))},function(e,r){e.exports=function(e){if(!e.webpackPolyfill){var r=Object.create(e);r.children||(r.children=[]),Object.defineProperty(r,"loaded",{enumerable:!0,get:function(){return r.l}}),Object.defineProperty(r,"id",{enumerable:!0,get:function(){return r.i}}),Object.defineProperty(r,"exports",{enumerable:!0}),r.webpackPolyfill=1}return r}}]);