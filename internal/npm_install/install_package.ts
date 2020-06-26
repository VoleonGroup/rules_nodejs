"user strict";

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as ssri from "ssri";
import * as tar from "tar";
import * as r from "request-promise";

function log_verbose(...m: any[]) {
  if (!!process.env["VERBOSE_LOGS"])
    console.error("[generate_build_file.ts]", ...m);
}

const args = process.argv.slice(2);
const WORKSPACE = args[0];
const PACKAGE = args[1].replace(/\./g, '_dot_');
const VERSION = args[2];
const URL = args[3];
const INTEGRITY = args[4];
const REQUIRED_TARGETS = args[5];

const BUILD_FILE_HEADER = `# Generated file from install_packages rule.
# See rules_nodejs/internal/npm_install/install_packages.ts

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

`;

if (require.main == module) {
  log_verbose(PACKAGE);
  log_verbose(URL);
  log_verbose(INTEGRITY);
  log_verbose(REQUIRED_TARGETS);
  main();
}

type Dep = {
  _name: string;
  _files: string[];
  _runfiles: string[];
  [k: string]: any;
};

type Bag<T> = {
  [k: string]: T;
};

export async function main() {
  // download package and verify integrity
  await downloadAndVerifyPackage(URL, INTEGRITY);

  const pkg: Dep = parsePackage();

  // add build files
  createBazelFiles(pkg);
}

/**
 * Given a url to an npm package archive, download it, perform integrity check,
 * extract it, then removes archive
 */
async function downloadAndVerifyPackage(url: string, integrity: string) {
  const filename: string = url.split("/").pop() as string;
  return r
    .get({ url: url, encoding: null })
    .then((res) => {
      const buffer = Buffer.from(res);
      fs.writeFileSync(filename, buffer);
    })
    .then((_) => {
      return ssri.checkStream(fs.createReadStream(filename), INTEGRITY);
    })
    .then((_) => {
      tar.extract({ file: filename, sync: true, strip: 1 });
    })
    .then((_) => {
      fs.unlinkSync(filename);
    });
}

/**
 * Parse package.json
 */
function parsePackage(): Dep {
  const packageJson = path.posix.join(".", "package.json");
  const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
  const pkg = isFile(packageJson)
    ? JSON.parse(stripBom(fs.readFileSync(packageJson, { encoding: "utf8" })))
    : { version: "0.0.0" };
  pkg._isNested = false;
  pkg._dir = ".";
  pkg._name = PACKAGE;
  // List all the files in the npm package for later use
  pkg._files = listFiles(".").filter((f) => f != "WORKSPACE");
  // The subset of files that are valid in runfiles.
  // Files with spaces (\x20) or unicode characters (<\x20 && >\x7E) are not allowed in
  // Bazel runfiles. See https://github.com/bazelbuild/bazel/issues/4327
  pkg._runfiles = pkg._files.filter((f: string) => !/[^\x21-\x7E]/.test(f))

  return pkg;
}

/**
 * Create BUILD files given the content of the repository
 */
function createBazelFiles(pkg: Dep) {
  let buildFile = printPackage(pkg);

  const binBuildFile = printPackageBin(pkg);
  if (binBuildFile.length) {
    buildFile = buildFile.concat("\n").concat(binBuildFile)
  }

  const indexFile = printIndexBzl(pkg);
  if (indexFile.length) {
    writeFileSync(path.posix.join(".", "index.bzl"), indexFile);
    buildFile = `${buildFile}
# For integration testing
exports_files(["index.bzl"])
`;
  }

  writeFileSync(
    path.posix.join(".", "BUILD.bazel"),
    BUILD_FILE_HEADER + buildFile
  );
}

/**
 * Create a new directory and any necessary subdirectories
 * if they do not exist.
 */
function mkdirp(p: string) {
  if (!fs.existsSync(p)) {
    mkdirp(path.dirname(p));
    fs.mkdirSync(p);
  }
}

/**
 * Writes a file, first ensuring that the directory to
 * write to exists.
 */
function writeFileSync(p: string, content: string) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content);
}

/**
 * Checks if a path is a file.
 */
function isFile(p: string) {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

/**
 * Checks if a path is an npm package which is is a directory with a package.json file.
 */
function isDirectory(p: string) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

/**
 * Returns an array of all the files under a directory as relative
 * paths to the directory.
 */
export function listFiles(rootDir: string, subDir: string = ""): string[] {
  const dir = path.posix.join(rootDir, subDir);
  if (!isDirectory(dir)) {
    return [];
  }
  return (
    fs
      .readdirSync(dir)
      .reduce((files: string[], file) => {
        const fullPath = path.posix.join(dir, file);
        const relPath = path.posix.join(subDir, file);
        const isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          if (isSymbolicLink) {
            // Filter out broken symbolic links. These cause fs.statSync(fullPath)
            // to fail with `ENOENT: no such file or directory ...`
            return files;
          }
          throw e;
        }
        const isDirectory = stat.isDirectory();
        if (isDirectory && isSymbolicLink) {
          // Filter out symbolic links to directories. An issue in yarn versions
          // older than 1.12.1 creates symbolic links to folders in the .bin folder
          // which leads to Bazel targets that cross package boundaries.
          // See https://github.com/bazelbuild/rules_nodejs/issues/428 and
          // https://github.com/bazelbuild/rules_nodejs/issues/438.
          // This is tested in /e2e/fine_grained_symlinks.
          return files;
        }
        return isDirectory
          ? files.concat(listFiles(rootDir, relPath))
          : files.concat(relPath);
      }, [])
      // We return a sorted array so that the order of files
      // is the same regardless of platform
      .sort()
  );
}

/**
 * Returns true if the specified `pkg` conforms to Angular Package Format (APF),
 * false otherwise. If the package contains `*.metadata.json` and a
 * corresponding sibling `.d.ts` file, then the package is considered to be APF.
 */
function isNgApfPackage(files: string[]) {
  const set = new Set(files);
  if (set.has("ANGULAR_PACKAGE")) {
    // This file is used by the npm/yarn_install rule to detect APF. See
    // https://github.com/bazelbuild/rules_nodejs/issues/927
    return true;
  }
  const metadataExt = /\.metadata\.json$/;
  return files.some((file) => {
    if (metadataExt.test(file)) {
      const sibling = file.replace(metadataExt, ".d.ts");
      if (set.has(sibling)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * A filter function for files in an npm package. Comparison is case-insensitive.
 * @param files array of files to filter
 * @param exts list of white listed case-insensitive extensions; if empty, no filter is
 *             done on extensions; '' empty string denotes to allow files with no extensions,
 *             other extensions are listed with '.ext' notation such as '.d.ts'.
 */
function filterFiles(files: string[], exts: string[] = []) {
  if (exts.length) {
    const allowNoExts = exts.includes("");
    files = files.filter((f) => {
      // include files with no extensions if noExt is true
      if (allowNoExts && !path.extname(f)) return true;
      // filter files in exts
      const lc = f.toLowerCase();
      for (const e of exts) {
        if (e && lc.endsWith(e.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }
  // Filter out BUILD files that came with the npm package
  return files.filter((file) => {
    const basenameUc = path.basename(file).toUpperCase();
    if (basenameUc === "_BUILD" || basenameUc === "_BUILD.BAZEL") {
      return false;
    }
    return true;
  });
}

export function printIndexBzl(pkg: Dep) {
  let result = "";
  const executables = _findExecutables(pkg);
  if (executables.size) {
    result = `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "nodejs_test", "npm_package_bin")

`;
    const data = [`@${WORKSPACE}//:${pkg._name}`];
    if (pkg._dynamicDependencies) {
      data.push(...pkg._dynamicDependencies);
    }

    for (const [name, path] of executables.entries()) {
      result = `${result}

# Generated helper macro to call ${name}
def ${name.replace(/-/g, "_")}(**kwargs):
    output_dir = kwargs.pop("output_dir", False)
    if "outs" in kwargs or output_dir:
        npm_package_bin(tool = "@${WORKSPACE}//:${name}_bin", output_dir = output_dir, **kwargs)
    else:
        nodejs_binary(
            entry_point = "@${WORKSPACE}//:${path}",
            install_source_map_support = False,
            data = [${data
              .map((p) => `"${p}"`)
              .join(", ")}] + kwargs.pop("data", []),
            templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${additionalAttributes(
              pkg,
              name
            )}
            **kwargs
        )

# Just in case ${name} is a test runner, also make a test rule for it
def ${name.replace(/-/g, "_")}_test(**kwargs):
    nodejs_test(
      entry_point = "@${WORKSPACE}//:${path}",
      install_source_map_support = False,
      data = [${data.map((p) => `"${p}"`).join(", ")}] + kwargs.pop("data", []),
      templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${additionalAttributes(
        pkg,
        name
      )}
      **kwargs
    )
`;
    }
  }
  return result;
}

/**
 * Check if a bin entry is a non-empty path
 */
function isValidBinPath(entry: any) {
  return isValidBinPathStringValue(entry) || isValidBinPathObjectValues(entry);
}

/**
 * If given a string, check if a bin entry is a non-empty path
 */
function isValidBinPathStringValue(entry: any) {
  return typeof entry === "string" && entry !== "";
}

/**
 * If given an object literal, check if a bin entry objects has at least one a non-empty path
 * Example 1: { entry: './path/to/script.js' } ==> VALID
 * Example 2: { entry: '' } ==> INVALID
 * Example 3: { entry: './path/to/script.js', empty: '' } ==> VALID
 */
function isValidBinPathObjectValues(entry: Bag<string>): boolean {
  // We allow at least one valid entry path (if any).
  return (
    entry &&
    typeof entry === "object" &&
    Object["values"](entry).filter((_entry) => isValidBinPath(_entry)).length >
      0
  );
}

/**
 * Cleanup a package.json "bin" path.
 *
 * Bin paths usually come in 2 flavors: './bin/foo' or 'bin/foo',
 * sometimes other stuff like 'lib/foo'.  Remove prefix './' if it
 * exists.
 */
function cleanupBinPath(p: string) {
  p = p.replace(/\\/g, "/");
  if (p.indexOf("./") === 0) {
    p = p.slice(2);
  }
  return p;
}

// function getBinTarget(p: string) {
//   let path = cleanupBinPath(p);
//   let segments = path.split("/");
//   return `${segments.slice(0, segments.length - 1).join("/")}:${
//     segments[segments.length - 1]
//   }`;
// }

function _findExecutables(pkg: Dep) {
  const executables = new Map();

  // For root packages, transform the pkg.bin entries
  // into a new Map called _executables
  // NOTE: we do this only for non-empty bin paths
  if (isValidBinPath(pkg.bin)) {
    if (!pkg._isNested) {
      if (Array.isArray(pkg.bin)) {
        if (pkg.bin.length == 1) {
          executables.set(PACKAGE, cleanupBinPath(pkg.bin[0]));
        } else {
          // should not happen, but ignore it if present
        }
      } else if (typeof pkg.bin === "string") {
        executables.set(PACKAGE, cleanupBinPath(pkg.bin));
      } else if (typeof pkg.bin === "object") {
        for (let key in pkg.bin) {
          if (isValidBinPathStringValue(pkg.bin[key])) {
            executables.set(key, cleanupBinPath(pkg.bin[key]));
          }
        }
      }
    }
  }

  return executables;
}

// Handle additionalAttributes of format:
// ```
// "bazelBin": {
//   "ngc-wrapped": {
//     "additionalAttributes": {
//       "configuration_env_vars": "[\"compile\"]"
//   }
// },
// ```
function additionalAttributes(pkg: Dep, name: string) {
  let additionalAttributes = "";
  if (
    pkg.bazelBin &&
    pkg.bazelBin[name] &&
    pkg.bazelBin[name].additionalAttributes
  ) {
    const attrs = pkg.bazelBin[name].additionalAttributes;
    for (const attrName of Object.keys(attrs)) {
      const attrValue = attrs[attrName];
      additionalAttributes += `\n    ${attrName} = ${attrValue},`;
    }
  }
  return additionalAttributes;
}

/**
 * Return the skylark nodejs_binary targets for the package.
 */
export function printPackageBin(pkg: Dep) {
  let result = "";
  const executables = _findExecutables(pkg);
  if (executables.size) {
    result = `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

`;
    const data = [`//:${pkg._name}`];
    if (pkg._dynamicDependencies) {
      data.push(...pkg._dynamicDependencies);
    }

    for (const [name, path] of executables.entries()) {
      result += `# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${name}_bin",
    entry_point = "//:${path}",
    install_source_map_support = False,
    data = [${data.map((p) => `"${p}"`).join(", ")}],${additionalAttributes(
        pkg,
        name
      )}
)
`;
    }
  }

  return result;
}

/**
 * Return the skylark `node_module_library` targets for the package.
 */
function printPackage(pkg: Dep) {
  function starlarkFiles(attr: string, files: string[], comment: string = "") {
    return `
    ${comment ? comment + "\n    " : ""}${attr} = [
        ${files.map((f: string) => `"//:${f}",`).join("\n        ")}
    ],`;
  }

  function findFile(files: string[], m: string) {
    const ml = m.toLowerCase();
    for (const f of files) {
      if (f.toLowerCase() === ml) {
        return f;
      }
    }
    return undefined;
  }

  // Create srcs for source filegroup
  const pkgFilesStarlark = pkg._runfiles.length
    ? starlarkFiles("srcs", pkg._runfiles)
    : "";

  // Files that are not valid runfiles
  const notPkgFiles = pkg._files.filter(
    (f: string) => !pkg._runfiles.includes(f)
  );
  const notPkgFilesStarlark = notPkgFiles.length
    ? starlarkFiles("srcs", notPkgFiles)
    : "";

  // If the package is in the Angular package format returns list
  // of package files that end with `.umd.js`, `.ngfactory.js` and `.ngsummary.js`.
  const namedSources = isNgApfPackage(pkg._files)
    ? filterFiles(pkg._runfiles, [".umd.js", ".ngfactory.js", ".ngsummary.js"])
    : [];
  const namedSourcesStarlark = namedSources.length
    ? starlarkFiles(
        "named_module_srcs",
        namedSources,
        "# subset of srcs that are javascript named-UMD or named-AMD scripts"
      )
    : "";

  // Typings files that are part of the npm package
  const dtsSources = filterFiles(pkg._runfiles, [".d.ts"]);
  const dtsStarlark = dtsSources.length
    ? starlarkFiles(
        "srcs",
        dtsSources,
        `# ${PACKAGE} package declaration files`
      )
    : "";

  // Flattened list of direct and transitive dependencies hoisted to root by the package manager
  const targtes = REQUIRED_TARGETS ? REQUIRED_TARGETS.split(",") : [];
  const depsStarlark = targtes
    .map((target) => `"${target}",`)
    .join("\n        ");

  let result = `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# Generated targets for npm package "${PACKAGE}"

# Files that are part of the npm package not including its nested node_modules
# (filtered by the 'included_files' attribute)
filegroup(
    name = "${PACKAGE}__files",${pkgFilesStarlark}
)

# Files that have been excluded from the ${PACKAGE}__files target above because
# they are not valid runfiles. See https://github.com/bazelbuild/bazel/issues/4327.
filegroup(
    name = "${PACKAGE}__not_files",${notPkgFilesStarlark}
    visibility = ["//visibility:private"],
)

# All of the files in the npm package including files that have been
# filtered out by 'included_files' or because they are not valid runfiles
# but not including nested node_modules.
filegroup(
    name = "${PACKAGE}__all_files",
    srcs = [":${PACKAGE}__files", ":${PACKAGE}__not_files"],
)

# The primary target for this package for use in rule deps
node_module_library(
    name = "${PACKAGE}",
    # direct sources listed for strict deps support
    srcs = [":${PACKAGE}__files"],
    # nested node_modules for this package plus flattened list of direct and transitive dependencies
    # hoisted to root by the package manager
    deps = [
        ${depsStarlark}
    ],
)

alias(name = "pkg", actual = ":${PACKAGE}")

# Target is used as dep for main targets to prevent circular dependencies errors
node_module_library(
    name = "${PACKAGE}__contents",
    srcs = [":${PACKAGE}__files", ":${PACKAGE}__nested_node_modules"],${namedSourcesStarlark}
    visibility = ["//:__subpackages__"],
)

# Typings files that are part of the npm package not including nested node_modules
node_module_library(
    name = "${PACKAGE}__typings",${dtsStarlark}
)

`;

  let mainEntryPoint = resolvePkgMainFile(pkg);

  // add an `npm_umd_bundle` target to generate an UMD bundle if one does
  // not exists
  if (mainEntryPoint && !findFile(pkg._files, `${PACKAGE}.umd.js`)) {
    result += `load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")

npm_umd_bundle(
    name = "${PACKAGE}__umd",
    package_name = "${PACKAGE}",
    entry_point = "//:${mainEntryPoint}",
    package = ":${PACKAGE}",
)

`;
  }

  return result;
}

/**
 * Tries to resolve the mainFile from a given pkg
 * This uses seveal mainFileNames in priority to find a correct usable file
 * @param {any} pkg
 * @returns {string | undefined}
 */
function resolvePkgMainFile(pkg: Dep) {
  // es2015 is another option for mainFile here
  // but its very uncommon and im not sure what priority it takes
  //
  // this list is ordered, we try resolve `browser` first, then `module` and finally fall back to
  // `main`
  const mainFileNames = ["browser", "module", "main"];

  for (const mainFile of mainFileNames) {
    const resolvedMainFile = resolveMainFile(pkg, mainFile);
    if (resolvedMainFile) {
      return resolvedMainFile;
    }
  }

  // if we cant find any correct file references from the pkg
  // then we just try looking around for common patterns
  const maybeRootIndex = findEntryFile(pkg, "index.js");
  if (maybeRootIndex) {
    return maybeRootIndex;
  }

  const maybeSelfNamedIndex = findEntryFile(pkg, `${pkg._name}.js`);
  if (maybeSelfNamedIndex) {
    return maybeSelfNamedIndex;
  }

  // none of the methods we tried resulted in a file
  log_verbose(`could not find entry point for npm package ${pkg._name}`);

  // at this point there's nothing left for us to try, so return nothing
  return undefined;
}

/**
 * Tries to resolve the entryPoint file from the pkg for a given mainFileName
 *
 * @param {any} pkg
 * @param {'browser' | 'module' | 'main'} mainFileName
 * @returns {string | undefined} the path or undefined if we cant resolve the file
 */
function resolveMainFile(pkg: Dep, mainFileName: string) {
  const mainEntryField = pkg[mainFileName];

  if (mainEntryField) {
    if (typeof mainEntryField === "string") {
      return findEntryFile(pkg, mainEntryField);
    } else if (
      typeof mainEntryField === "object" &&
      mainFileName === "browser"
    ) {
      // browser has a weird way of defining this
      // the browser value is an object listing files to alias, usually pointing to a browser dir
      const indexEntryPoint =
        mainEntryField["index.js"] || mainEntryField["./index.js"];
      if (indexEntryPoint) {
        return findEntryFile(pkg, indexEntryPoint);
      }
    }
  }
}

/**
 * Cleanup a package.json entry point such as "main"
 *
 * Removes './' if it exists.
 * Appends `index.js` if p ends with `/`.
 */
function cleanupEntryPointPath(p: string) {
  p = p.replace(/\\/g, "/");
  if (p.indexOf("./") === 0) {
    p = p.slice(2);
  }
  if (p.endsWith("/")) {
    p += "index.js";
  }
  return p;
}

/**
 * Looks for a file within a package and returns it if found.
 */
function findFile(pkg: Dep, m: string) {
  const ml = m.toLowerCase();
  for (const f of pkg._files) {
    if (f.toLowerCase() === ml) {
      return f;
    }
  }
  return undefined;
}

/**
 * Cleans up the given path
 * Then tries to resolve the path into a file and warns if VERBOSE_LOGS set and the file dosen't
 * exist
 * @param {any} pkg
 * @param {string} path
 * @returns {string | undefined}
 */
function findEntryFile(pkg: Dep, path: string) {
  const cleanPath = cleanupEntryPointPath(path);
  // check if main entry point exists
  const entryFile =
    findFile(pkg, cleanPath) || findFile(pkg, `${cleanPath}.js`);
  if (!entryFile) {
    // If entryPoint entry point listed could not be resolved to a file
    // This can happen
    // in some npm packages that list an incorrect main such as v8-coverage@1.0.8
    // which lists `"main": "index.js"` but that file does not exist.
    log_verbose(
      `could not find entry point for the path ${cleanPath} given by npm package ${pkg._name}`
    );
  }
  return entryFile;
}
