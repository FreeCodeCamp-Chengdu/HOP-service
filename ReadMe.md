# Hackathon Open Platform - API service

[REST][1]ful API service scaffold based on [Node.js][2] & [TypeScript][3], which is a reimplement of [OHP API service v4](https://github.com/kaiyuanshe/open-hackathon-api).

[![Deploy to Production environment](https://github.com/FreeCodeCamp-Chengdu/HOP-service/actions/workflows/deploy-production.yml/badge.svg)][4]

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)][5]

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)][6]
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)][7]

## Technology stack

1. HTTP server: [Koa][8]
2. Controller framework: [Routing Controllers][9]
3. Model framework: [Class Transformer][10] & [Class Validator][11]
4. ORM framework: [TypeORM][12]
5. API document: [Swagger][13]
6. Mock API: [OpenAPI backend][14]
7. Test framework: [Jest][15]

## Major features

1. [API entry & Health checking](source/controller/Base.ts)
2. User management
    1. [Session](source/controller/User.ts)
    2. [OAuth sign in](source/controller/OAuth.ts)
        - recommend to use with [Next SSR middleware][16]
    3. [Platform Admin](source/controller/PlatformAdmin.ts)
3. [Activity logging](source/controller/ActivityLog.ts)
4. Hackathon management
    1. [Meta](source/controller/Hackathon.ts)
    2. [Staff](source/controller/Staff.ts)
    3. [Organizer](source/controller/Organizer.ts)
    4. [Announcement](source/controller/Announcement.ts)
    5. [Git template](source/controller/GitTemplate.ts)
    6. [Questionnaire & Standard](source/controller/Questionnaire.ts)
    7. [Enrollment](source/controller/Enrollment.ts)
5. Team management
    1. [Meta](source/controller/Team.ts)
    2. [Member](source/controller/Member.ts)
    3. [Work](source/controller/Work.ts)
    4. [Evaluation](source/controller/Evaluation.ts)

## Best practice

1.  Install GitHub apps in your organization or account:
    1.  [Probot settings][17]: set up Issue labels & Pull Request rules
    2.  [PR badge][18]: set up Online [VS Code][19] editor entries in Pull Request description

2.  Click the **[<kbd>Use this template</kbd>][20] button** on the top of this GitHub repository's home page, then create your own repository in the app-installed namespace above

3.  Click the **[<kbd>Open in GitHub codespaces</kbd>][8] button** on the top of ReadMe file, then an **online VS Code development environment** will be started immediately

4.  Recommend to add a [Notification step in GitHub actions][21] for your Team IM app

5.  Remind the PMs & users of your product to submit **Feature/Enhancement** requests or **Bug** reports with [Issue forms][22] instead of IM messages or Mobile Phone calls

6.  Collect all these issues into [Project kanbans][23], then create **Pull requests** & add `closes #issue_number` into its description for automation

## API Usage

- Entry: http://localhost:8080/
- Document: http://localhost:8080/docs/
- Schema: http://localhost:8080/docs/spec/
- Type: https://github.com/FreeCodeCamp-Chengdu/HOP-service/pkgs/npm/hop-service

## Environment variables

|      Name      |            Usage             |
| :------------: | :--------------------------: |
|  `JWT_SECRET`  |   encrypt Password & Token   |
| `DATABASE_URL` | PostgreSQL connection string |

## Development

### Installation

```shell
npm i pnpm -g
pnpm i
```

### Start Development environment

```shell
pnpm dev
```

or just press <kbd>F5</kbd> key in [VS Code][19].

### Migration

```shell
pnpm upgrade:dev
```

## Deployment

### Start Production environment

```shell
npm start
```

### Migration

```shell
pnpm upgrade:pro
```

### Docker

```shell
pnpm pack-image
pnpm container
```

## Releasing

### Deploy Application

```shell
git checkout master
git tag v1.0.0  # this version tag comes from ./package.json
git push origin master --tags
```

### Publish Type Package

```shell
git checkout master
git tag type-v1.0.0  # this version tag comes from ./type/package.json
git push origin master --tags
```

[1]: https://en.wikipedia.org/wiki/Representational_state_transfer
[2]: https://nodejs.org/
[3]: https://www.typescriptlang.org/
[4]: https://github.com/FreeCodeCamp-Chengdu/HOP-service/actions/workflows/deploy-production.yml
[5]: https://render.com/deploy
[6]: https://codespaces.new/FreeCodeCamp-Chengdu/hop-service
[7]: https://gitpod.io/?autostart=true#https://github.com/FreeCodeCamp-Chengdu/HOP-service
[8]: https://koajs.com/
[9]: https://github.com/typestack/routing-controllers
[10]: https://github.com/typestack/class-transformer
[11]: https://github.com/typestack/class-validator
[12]: https://typeorm.io/
[13]: https://swagger.io/
[14]: https://github.com/anttiviljami/openapi-backend
[15]: https://jestjs.io/
[16]: https://github.com/idea2app/Next-SSR-middleware
[17]: https://github.com/apps/settings
[18]: https://pullrequestbadge.com/
[19]: https://code.visualstudio.com/
[20]: https://github.com/new?template_name=hop-service&template_owner=FreeCodeCamp-Chengdu
[21]: https://github.com/idea2app/Lark-Next-Bootstrap-ts/blob/80967ed49045af9dbcf4d3695a2c39d53a6f71f1/.github/workflows/pull-request.yml#L9-L11
[22]: https://github.com/FreeCodeCamp-Chengdu/HOP-service/issues/new/choose
[23]: https://github.com/FreeCodeCamp-Chengdu/HOP-service/projects
