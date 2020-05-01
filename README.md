#Media Generation
Lambda function for creating resized images in S3.

Dependencies
============
AWS CLI: https://aws.amazon.com/cli/\
SAM: https://docs.aws.amazon.com/serverless-application-model/index.html\
Docker: https://docs.docker.com/\
Yarn: https://classic.yarnpkg.com/docs\

Installation
============
* Clone the repository, then make the desired code changes
```bash
git clone https://github.com/ndevrinc/lambda-media-generation.git
```

* Copy example files, make desired changes
```bash
yarn run examples
```

* Run build to generate all the necessary packages
```bash
yarn run build
```

* Run unit tests to make sure added customization passes the tests:
```bash
yarn run test
```

Use & Deployment
================
* Create a Amazon S3 Buckets for source and destination(s)
```
aws s3 mb s3://test-bucket-source1 --region us-east-1
```
> Note: You must have the AWS CLI installed.

* Using SAM, build (this isn't working at the moment, just use yarn run build)
```bash
sam build
```
> Note: You must have SAM installed.

* Using SAM, deploy to Amazon
```bash
sam deploy --guided
```

***

Copyright 2020 Ndevr, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.