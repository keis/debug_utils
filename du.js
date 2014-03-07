var listenMethods = [
  'addEventListener',
  'addListener',
  'attachEvent',
  'on'
];

var removeListenerMethods = [
  'removeEventListener',
  'removeListener',
  'off'
];

var dontKnowHowToListenMsg = 'Don\'t how to listen to your object, please ' +
  'open an issue if you think we should be able to.';

var listeners = {};

function debugEvent(object, event, isLog) {
  assert(
    object && typeof object === 'object' && typeof event === 'string',
    'Need an object to listen to and an event to listen on.'
  );

  var ret, handler;

  if (isLog) {
    handler = function() {
      console.log('Event %s fired on %s with args', arguments);
    };
  } else {
    handler = function() {
      debugger;
    };
  }

  ret = applyOne(
    object,
    listenMethods,
    [event, handler],
    dontKnowHowToListenMsg
  );

  if (!listeners[event]) listeners[event] = [];
  listeners[event].push({
    object: object,
    handler: handler
  });

  return ret;
}

function $duv(object, event) {
  return debugEvent(object, event, false);
}

function $duvl(object, event) {
  return debugEvent(object, event, true);
}

function $duvr(object, event) {
  listeners[event].filter(function(desc) {
    return desc.object === object;
  }).forEach(function(desc) {
    applyOne(
      object,
      removeListenerMethods,
      [event, desc.handler],
      dontKnowHowToListenMsg
    );
  });
}

function genInjection(fn, injectedCode) {
  var id = uid();
  Object.defineProperty(fn, '__$duuid', {
    value: id,
    configurable: false,
    enumerable: false,
    writable: false
  });
  return '\n// ' + id + '\n' + injectedCode;
}

function removeDebuggerStatement(sourceFile, fnSource, fn) {
  assert(fn.__$duuid, 'Function was not debugged by $duf()');
  var id = fn.__$duuid;
  var source = getSource(fn);
  var lines = source.split('\n');
  assert(
    lines[1] === '// ' + id, 'Cannot find my debugger statement.'
  );
  assert(
    lines[2] === 'debugger;' ||
      lines[2] === 'console.log(arguments);',
    'Cannot find my debugger statement.'
  );
  lines.splice(1, 2);
  modified = lines.join('\n');
  sourceFile.setContent(
    sourceFile.getContent().replace(fnSource, modified),
    function(status) {
      assert(
        status.code === 'OK',
        'Error updating source code for file ' + sourceFile.url
      );
      console.log('Debugger statement removed succesfully');
    }
  )
}

function injectStatement(sourceFile, fnSource, fn, injectedCode) {
  var m = fnSource.match(/^function\s+[^\(]*\([^\)]*\)\s*\{/);
  if (!m) throw new Error('Error parsing function source.');
  var len = m[0].length;
  var modified =
    fnSource.substr(0, len) +
    genInjection(fn, injectedCode) +
    fnSource.substr(len);
  sourceFile.setContent(
    sourceFile.getContent().replace(fnSource, modified),
    function(status) {
      assert(
        status.code === 'OK',
        'Error updating source code for file ' + sourceFile.url
      );
      console.log('Debug statement added succesfully');
    }
  );
}

function addLogStatement(sourceFile, fnSource, fn) {
  injectStatement(sourceFile, fnSource, fn, 'console.log(arguments);');
}

function addDebuggerStatment(sourceFile, fnSource, fn) {
  injectStatement(sourceFile, fnSource, fn, 'debugger;');
}

function getSource(ref) {
  assert(typeof ref === 'function', ref + ' is not a function.');

  var source = ref.toString();

  if (source.match('\[native\scode]\s\}$')) {
    throw new Error('Can\'t step debug native code, try $dum()');
  }

  return source;
}

function getResourceFor(source, url, callback) {
  chromeAPI.getResources(function(resources) {
    var sourceFiles = resources.filter(function(res) {
      if (url && res.url.indexOf(url) === -1) {
        return false;
      } else {
        return res.getContent().indexOf(source) !== -1
      }
    });
    var sourceFile = sourceFiles[0];
    if (!sourceFiles.length) {
      throw new Error('Function not found in loaded resources.');
    } else if (sourceFiles.length > 1) {
      console.warn(
        'Found more than source file with the same function',
        'Try supplying a resource url or using $dum()'
      );
    }
    callback && callback(sourceFile);
  });
}

function $duf(ref, url) {
  var source = getSource(ref);

  getResourceFor(source, url, function(resource) {
    addDebuggerStatment(resource, source, ref);
  });
}

function $dufl(ref, url) {
  var source = getSource(ref);

  getResourceFor(source, url, function(resource) {
    addLogStatement(resource, source, ref);
  });
}

function $dufr(ref, url) {
  var source = getSource(ref);

  getResourceFor(source, url, function (resource) {
    removeDebuggerStatement(resource, source, ref);
  });
}

/**
 * Export for testing.
 */

if (typeof module === 'object' && typeof exports === 'object') {
  module.exports = {
    $duv: $duv,
    $duvl: $duvl,
    $duvr: $duvr,
    $duf: $duf,
    $dufl: $dufl,
    $dufr: $dufr
  };
}

/**
 * Utils.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function applyOne(object, methods, args, message) {
  for (var i = 0; i < methods.length; i++) {
    var fn = object[methods[i]];
    if (typeof fn === 'function') {
      return fn.apply(object, args);
    }
  }
  if (message) {
    throw new Error(message);
  }
}

function uid(len) {
  len = len || 7;
  return Math.random().toString(35).substr(2, len);
}