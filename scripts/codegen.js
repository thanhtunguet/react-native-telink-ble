const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const content = readFileSync(
  path.resolve(__dirname, '..', 'src', 'BleEvent.ts'),
  'utf-8'
);
const regex = /([A-Z0-9_]+)\s=\s'([A-Z_]+)',?/gm;

const matches = [...content.matchAll(regex)];
// console.log(matches.map(([, key, value]) => `#define ${key} "${value}"`).join("\n"));

// let kotlin = matches
//   .map(([, key, value]) => `const val ${key}: String = "${value}"`)
//   .join('\n');
// kotlin += `\n\npublic val supportedDeviceTypes = arrayOf(\n\t${matches
//   .map((match) => match[1])
//   .join(',\n\t')}\n)`;
// writeFileSync(
//   path.resolve(
//     __dirname,
//     '../android/app/src/main/java/com/react/telink/ble/DeviceTypes.kt'
//   ),
//   kotlin
// );

const maxLength = Math.max(...matches.map(([, key]) => key.length));

function fill(str, length) {
  let result = str;
  while (result.length < length) {
    result += ' ';
  }
  return result;
}

const objc = matches
  .map(([, key, value]) => `#define ${fill(key, maxLength + 3)} @"${value}"`)
  .join('\n');
writeFileSync(
  path.resolve(__dirname, '../ios/BleEvent.h'),
  `//
//  BleEvent.h
//  TelinkBle
//
//  Created by Thanh Tùng on 06/04/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

#ifndef BleEvent_h
#define BleEvent_h

${objc}

#endif /* BleEvent_h */
`
);
