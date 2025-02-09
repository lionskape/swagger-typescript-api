const fs = require("node:fs");
const { resolve } = require("node:path");
const _ = require("lodash");
const { Logger } = require("./logger");

const FILE_PREFIX = `/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

`;

class FileSystem {
  /** @type {Logger} */
  logger;

  constructor({ logger = new Logger("file-system") } = {}) {
    this.logger = logger;
  }

  getFileContent = (path) => {
    return fs.readFileSync(path, { encoding: "utf8" });
  };

  readDir = (path) => {
    return fs.readdirSync(path);
  };

  pathIsDir = (path) => {
    if (!path) return false;

    try {
      const stat = fs.statSync(path);
      return stat.isDirectory();
    } catch (e) {
      return false;
    }
  };

  cropExtension = (fileName) => {
    const fileNameParts = _.split(fileName, ".");

    if (fileNameParts.length > 1) {
      fileNameParts.pop();
    }

    return fileNameParts.join(".");
  };

  removeDir = (path) => {
    try {
      if (typeof fs.rmSync === "function") {
        fs.rmSync(path, { recursive: true });
      } else {
        fs.rmdirSync(path, { recursive: true });
      }
    } catch (e) {
      this.logger.debug("failed to remove dir", e);
    }
  };

  createDir = (path) => {
    try {
      fs.mkdirSync(path, { recursive: true });
    } catch (e) {
      this.logger.debug("failed to create dir", e);
    }
  };

  cleanDir = (path) => {
    this.removeDir(path);
    this.createDir(path);
  };

  pathIsExist = (path) => {
    return !!path && fs.existsSync(path);
  };

  createFile = ({ path, fileName, content, withPrefix }) => {
    const absolutePath = resolve(__dirname, path, `./${fileName}`);
    const fileContent = `${withPrefix ? FILE_PREFIX : ""}${content}`;

    return fs.writeFileSync(absolutePath, fileContent, _.noop);
  };
}

module.exports = {
  FileSystem,
};
