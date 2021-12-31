# XLights FSEQ Light Show Validator

[![npm package](https://img.shields.io/badge/npm%20i-@xsor/tlsv-brightgreen)](https://www.npmjs.com/package/@xsor/tlsv) 
[![version](https://img.shields.io/npm/v/@xsor/tlsv)](](https://github.com/xsorifc28/tlsv/releases) )
[![coverage](https://img.shields.io/codecov/c/github/xsorifc28/tlsv)](https://app.codecov.io/gh/xsorifc28/tlsv)
[![License](https://img.shields.io/github/license/xsorifc28/tlsv)](https://github.com/xsorifc28/tlsv/blob/main/LICENSE)

A npm package based on [Tesla Light Show](https://github.com/teslamotors/light-show) for validating FSEQ file compatability with Tesla vehicles.

Contains the following modules:
- a CommonJS (in **dist/cjs** folder)
- ES Modules (in **dist/esm** folder)
- bundled and minified UMD (in **dist/umd** folder)
- TypeScript declaration files (in **dist/types** folder)

## Description

This package provides a `Validation` function which takes in the contents of an FSEQ file and checks it against [custom light show limitations provided by Tesla](https://github.com/teslamotors/light-show#general-limitations-of-custom-shows).

## Usage 

### Node

1. Install the package:
```bash
npm install @xsor/tlsv
```
2. Import and use the `Validator` function
```js
import { Validator} from '@xsor/tlsv';

const fileContents = fs.readFileSync(path.join(__dirname, 'path/to/lightshow.fseq'));
const validationResult: ValidationResults = Validator(fileContents.buffer);

if(!validationResult.error) {
    // File is valid
} else {
    // File is invalid
    console.error(validationResult.error);
}
```

### Browser
1. Bundle or import the script (e.g. webpack, unpkg)
2. Use the `Validator` function
```js
let file = document.getElementById('fileInputId').files[0];

const reader = new FileReader();

reader.onload = (event) => {
  const validationResult = Validator(event.target.result);
};

reader.onerror = function(e) {
  resolve({
    error: 'Error reading file: ' + e.message
  });
};

reader.readAsArrayBuffer(file);
```
## Contributing

Feel free to make a pull request and file issues on the repository page!

### Test

Test your code with Jest framework:

```bash
npm run test
```

**Note:** Uses [husky](https://typicode.github.io/husky/) and [commitlint](https://commitlint.js.org/) to automatically execute test and [lint commit message](https://www.conventionalcommits.org/) before every commit.

### Build

Build production (distribution) files in your **dist** folder:

```bash
npm run build
```


### Thank You

This repository was heavily based on the [example-typescript-package](https://github.com/tomchen/example-typescript-package) template provided by [tomchen](https://github.com/tomchen).
