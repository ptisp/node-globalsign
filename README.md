GLOBALSIGN Node Module
=========

GLOBALSIGN API Node client.

## Installation

```
npm install globalsign
```

## Usage

First you need to instantiate it.

```javascript

var GlobalSign = require('globalsign');

var config = {
  dev: process.env.GSIGN_DEV || false,
  username: process.env.GSIGN_USER,
  password: process.env.GSIGN_PASSWORD,
};

var globalsignsexample = new GlobalSign(config);
```

Using the created client, call the methods you need, example:

```javascript



globalsignsexample.on('ready', function() {
  globalsignsexample.getAccountInfo(function(err, data) {
    if (err) { ... }
    else { ... }
  };

  var csr = '...';
  var ptype = 'xpto';
  globalsignsexample.asslDecodeCSR(csr, ptype, function(err, data) {
    if (err) { ... }
    else { ... }
  };

}

```


## Examples

Check the examples folder for more specific use cases examples.

## License

Licensed under the Apache license, version 2.0 (the "license"); You may not use this file except in compliance with the license. You may obtain a copy of the license at:

http://www.apache.org/licenses/LICENSE-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
