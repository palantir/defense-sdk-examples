# [React] Gaia Map API Gateway Example

### Try It Out!
This application demonstrates how to use Palantir's Gaia Map API Gateway in React (Typescript).  

To try this yourself, navigate to the **Developer Console** application in your Foundry enrollment.  If you don't already have a third party app (confidential client).  You will need to copy the client secret when it's provided and use it in the next step. 

<br>

Next, create a `.env` file at the project folder map-api-react/ and populate it with:
    

    VITE_CLIENT_URL=https://<foundry hostname>
    VITE_CLIENT_ID=<client id>
    VITE_CLIENT_SECRET=<client secret>
    VITE_REDIRECT_URL=http://localhost:8080/auth/callback


  You can get the `<client id>` value from your developer console third party application &rarr; Permissions &rarr; OAuth & Scopes &rarr; copy the Client ID value.

If applicable to your enrollment, make sure that you set your DOD root certificate, e.g.:

    export NODE_EXTRA_CA_CERTS=DOD_Root_CA_6.crt

Now we can install dependencies and run the application via `npm install`.  The output should look something like this:
```
➜  map-api-react git:(develop) ✗ npm install

up to date, audited 371 packages in 703ms

54 packages are looking for funding
  run `npm fund` for details

1 moderate severity vulnerability

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```
Now, you can run the project via `npm run dev` which will give you an output that looks like:
```
➜  map-api-react git:(develop) ✗ npm run dev

> > palantir-map-api@0.0.0 dev
> NODE_EXTRA_CA_CERTS=./DOD_Root_CA_6.crt vite


  VITE v5.2.13  ready in 101 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
Click the [localhost](http://localhost:8080/) link to access the application!

### About the Application
Enter a Gaia map ID into the input at the top.  You can get an ID for a map in Gaia via the Help menu &rarr; Developer &rarr; Copy id.  Once you have a map, you can input a layer ID or drag a layer from that map into the input to set the layer ID.  
  - We use the [Spatial Illusions milsym library](https://github.com/spatialillusions/milsymbol) to render the military symbology elements in the layer.

To learn more about the Gaia Map API, refer to the `gaia-api.yml` located in the public/ folder in this project or check out [Palantir's API documentation](https://www.palantir.com/docs/gotham/api/map-resources/maps) for the Gaia Map API Gateway.

The Gaia Map API Gateway logic is all contained to maptApiGateway.saga.ts.  In that file, check out:

- **fetchLoadLayerSaga** - loads the layer information, including layer elements


### Library Dependencies

**Leafletjs**

BSD 2-Clause License

Copyright (c) 2010-2024, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


**Spatial Illusions**

The MIT License (MIT)

Copyright (c) 2017 Måns Beckman - www.spatialillusions.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
