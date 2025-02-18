# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
{
  'includes': [
    '../../coreconf/config.gypi'
  ],
  'targets': [
    {
      'target_name': 'lib_pk11wrap_exports',
      'type': 'none',
      'copies': [
        {
          'files': [
            'pk11func.h',
            'pk11pqg.h',
            'pk11priv.h',
            'pk11pub.h',
            'pk11sdr.h',
            'secmod.h',
            'secmodt.h',
            'secpkcs5.h'
          ],
          'destination': '<(PRODUCT_DIR)/dist/<(module)/public'
        },
        {
          'files': [
            'dev3hack.h',
            'secmodi.h'
          ],
          'destination': '<(PRODUCT_DIR)/dist/<(module)/private'
        }
      ]
    }
  ],
  'variables': {
    'module': 'nss'
  }
}