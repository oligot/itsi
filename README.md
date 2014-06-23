# itsi

> Simple CLI task manager

For the moment, only work with
* [Redmine](http://www.redmine.org/) as issue tracker
* [Git](http://www.git-scm.com/) as source control manager

## Installation

Install with npm

```shell
npm install -g itsi
```

## Usage

Create an issue with

```shell
itsi create "Issue subject"
```

It will automatically ask you which project you want to create an issue in.
The first time, it will ask for the API key and for the server URL.

The API key can be found when you log into redmine.
The URL of the tracker is something like `http://redmine.example.com` and yes the `http://` is necessary.

Start to work on an issue with

```shell
itsi work
```

Commit the work done on the issue with

```shell
itsi done
```
