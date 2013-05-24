// jquery mobile parameter plugin
//
// This software is based on the parameter plugin at
//   https://github.com/jblas/jquery-mobile-plugins/
// and is licensed under the (3-clause) BSD license:
//
// Copyright (c) 2011, Kin Blas
//               2013, André Gaul
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the <organization> nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

$(document).on('mobileinit', function () {
  $.mobile.linkBindingEnabled = false
  $.mobile.hashListeningEnabled = false;
});

// this notation is explained at
//   http://stackoverflow.com/a/5947280
(function (params) {

  var firstPage = true;
  params.ignoreNextHashChange = false;

  params.string2obj = function (str) {
    var result = {},
      nvPairs = ( ( str || "" ).replace( /^\?/, "" ).split( /&/ ) ),
      i, pair, n, v;
    for ( i = 0; i < nvPairs.length; i++ ) {
      var pstr = nvPairs[ i ];
      if ( pstr ) {
        pair = pstr.split( /=/ );
        n = pair[ 0 ];
        v = pair[ 1 ];
        if ( result[ n ] === undefined ) {
          result[ n ] = v;
        } else {
          if ( typeof result[ n ] !== "object" ) {
            result[ n ] = [ result[ n ] ];
          }
          result[ n ].push( v );
        }
      }
    }
    return result;
  }

  params.parseUrl = function (url) {
    var loc = $.mobile.path.parseUrl( url );
    var ret = {
      hrefnosearch: loc.hrefNoSearch,
      hash: loc.hash.replace( /^#/, ""),
      search: loc.search
    };
    if (ret.hash) {
      loc = $.mobile.path.parseUrl( ret.hash );
      ret.hash = loc.pathname;
      ret.search = loc.search;
    }
    return ret;
  }

  params.hashchange = function () {
    if (!params.ignoreNextHashChange) {
      $.mobile.changePage( $.mobile.path.parseLocation().hash , {
        allowSamePageTransition: true,
        transition: "none"
      });
    }
    params.ignoreNextHashChange = false;
  }

  params.sethash = function (hash) {
    if (hash != window.location.hash) {
        params.ignoreNextHashChange = true;
        window.location.hash = hash;
    }
  }

  params.pagebeforechange = function (e, data) {
    var parsedUrl;
    if (firstPage) {
      parsedUrl = params.parseUrl(window.location.href);
    } else if (typeof data.toPage === "string") {
      parsedUrl = params.parseUrl( data.toPage );
    } else {
      return;
    }

    firstPage=false;
    if (!data.options.dataUrl) {
      data.options.dataUrl = data.toPage;
    }

    data.toPage = parsedUrl.hrefnosearch + "#" + parsedUrl.hash;
    if (parsedUrl.search) {
      data.options.pageData = params.string2obj( parsedUrl.search );
    }

    $.mobile.pageData = (data && data.options && data.options.pageData)
      ? data.options.pageData
      : null;
  }

}( window.params = window.params || {} ));

// register event handlers
$(document).ready( function () {

  $(window).hashchange( function () {
    window.params.hashchange();
  });

  $( document ).on( 'pagebeforechange', params.pagebeforechange);
});
