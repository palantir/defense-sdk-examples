# [React] Target API Gateway Example

### Try It Out!
This application demonstrates how to use Palantir's Target API Gateway in React (Typescript).  

To try this yourself, navigate to the **Developer Console** application in your Foundry enrollment.  If you don't already have a third party app (confidential client).  You will need to copy the client secret when it's provided and use it in the next step. 

<br>

Next, create a `.env` file at the project folder target-api-react/ and populate it with:
    

    VITE_CLIENT_URL=https://<foundry hostname>
    VITE_CLIENT_ID=<client id>
    VITE_CLIENT_SECRET=<client secret>
    VITE_REDIRECT_URL=http://localhost:8080/auth/callback


  You can get the `<client id>` value from your developer console third party application &rarr; Permissions &rarr; OAuth & Scopes &rarr; copy the Client ID value.

If applicable to your enrollment, make sure that you set your DOD root certificate, e.g.:

    export NODE_EXTRA_CA_CERTS=DOD_Root_CA_6.crt

Now we can install dependencies and run the application via `npm install`.  The output should look something like this:
```
➜  target-api-react git:(develop) ✗ npm install

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
➜  target-api-react git:(develop) ✗ npm run dev

> > palantir-target-api@0.0.0 dev
> NODE_EXTRA_CA_CERTS=./DOD_Root_CA_6.crt vite


  VITE v5.2.13  ready in 101 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
Click the [localhost](http://localhost:8080/) link to access the application!

### About the Application
Enter a target board RID into the input at the top.  You can get a RID for a target board in Target Workbench via the Help menu &rarr; Developer &rarr; Copy id.  
  - Selecting a target on the map will load information about the target on the right.
  - When targets lack a "last observed location" property, they will appear on the left side in a table.  Rows in the table are similarly select-able.
  - Right click on the map to add an observation to a target.  The target rid will be pre-populate with the currently selected target (if one is selected).  The location (latitude, longitude) will pre-populate to the location of the cursor right click action. 
  - Right click on the map to create a new target.  The board rid will be pre-populate with the currently selected target board from the drop down (if one is selected).  The location (latitude, longitude) will pre-populate to the location of the cursor right click action. 

To learn more about the Target API, reach out to your Palantir POC to obtain the API defintion.  

The Target API Gateway logic is all contained to targetApiGateway.saga.ts.  In that file, check out:

- **fetchTargetsForBoard** - loads targets for the input target board
- **createNewTarget** - creates a new target
- **addNewObservation** - adds an observation (location) to a target



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