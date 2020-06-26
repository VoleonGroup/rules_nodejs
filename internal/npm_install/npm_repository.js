"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const process = require("process");
const semver = require("semver");
const console_1 = require("console");
function log_verbose(...m) {
    if (!!process.env["VERBOSE_LOGS"])
        console.error("[generate_build_file.ts]", ...m);
}
const args = process.argv.slice(2);
const WORKSPACE = args[0];
const LOCK_FILE_PATH = args[1];
function depID(dep) {
    return `${dep._name}@${dep._version}`;
}
class DepSet {
    constructor(start, prefix) {
        log_verbose(`Creating Depset for ${depID(start)}: ${start._repoName}`);
        this.parent = start;
        [this.depmap, this.packages] = DepSet.extractDep(prefix, start);
        this.depmap.forEach((dep) => {
            this.parentify(dep);
        });
        log_verbose(`Depset created for ${depID(start)}:`);
        this.depmap.forEach((dep) => {
            log_verbose(`${depID(dep)}: ${dep._repoName}`);
        });
    }
    parentify(dep) {
        dep._parent = this.parent;
        dep._repoName = repoName(dep);
        return dep;
    }
    add(other) {
        if (!this.packages.has(depID(other))) {
            this.packages.add(depID(other));
            this.depmap.set(depID(other), this.parentify(DepSet.clone(other)));
        }
    }
    merge(other) {
        other.depmap.forEach(dep => {
            this.add(dep);
        });
    }
    depArray() {
        return Array.from(this.depmap.values());
    }
}
DepSet.clone = function (dep) {
    let clone = {};
    clone._name = dep._name;
    clone._version = dep._version;
    clone._integrity = dep._integrity;
    clone._resolved = dep._resolved;
    clone._dependencies = [];
    clone._required_deps = [];
    clone._parent = null;
    return clone;
};
DepSet.extractDep = function (prefix, dep) {
    let depmap = new Map();
    let packages = new Set();
    prefix.add(dep);
    let allReqs = (dep._required_deps || []).filter(req => !prefix.has(req));
    allReqs = allReqs.concat((dep._required_deps || []).filter(req => !prefix.has(req)));
    allReqs.forEach(req => {
        let reqdeps, reqpacs;
        [reqdeps, reqpacs] = DepSet.extractDep(prefix, req);
        reqpacs.forEach((pac) => {
            if (!packages.has(pac)) {
                packages.add(pac);
                depmap.set(pac, reqdeps.get(pac));
            }
        });
        packages.add(depID(req));
        depmap.set(depID(req), DepSet.clone(req));
    });
    prefix.delete(dep);
    return [depmap, packages];
};
if (require.main === module) {
    main();
}
function mkdirp(p) {
    if (!fs.existsSync(p)) {
        mkdirp(path.dirname(p));
        fs.mkdirSync(p);
    }
}
function writeFileSync(p, content) {
    mkdirp(path.dirname(p));
    fs.writeFileSync(p, content);
}
function main() {
    const pkgs = findPackages(LOCK_FILE_PATH);
    const topLevelMapping = new Map();
    pkgs.forEach(pkg => {
        console_1.assert(!topLevelMapping.has(pkg._name), `${pkg._name} already exists!`);
        topLevelMapping.set(pkg._name, [pkg]);
    });
    resolveRequires(topLevelMapping, pkgs);
    pkgs.forEach(pkg => {
        breakCycles([], pkg);
    });
    const packagesBzl = generatePackagesBzl(pkgs);
    writeFileSync("packages.bzl", packagesBzl);
    writeFileSync(".bazelignore", "node_modules");
    writeFileSync("BUILD", "");
}
exports.main = main;
function findPackages(packageLock) {
    const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
    let lockData = JSON.parse(stripBom(fs.readFileSync(packageLock, { encoding: "utf8" })));
    return extractPackages(null, lockData.dependencies);
}
function extractPackages(parent, dependencies) {
    const pkgs = [];
    const deps = dependencies || [];
    Object.keys(deps).forEach((name) => {
        let pkg = {};
        let dep = deps[name];
        pkg._name = name;
        pkg._parent = parent;
        pkg._version = dep.version;
        pkg._resolved = dep.resolved;
        pkg._integrity = dep.integrity;
        pkg._requires = dep.requires;
        pkg._dependencies = extractPackages(pkg, dep.dependencies);
        pkg._repoName = repoName(pkg);
        pkg.dependencies = dep.dependencies;
        pkg.requires = dep.requires;
        pkgs.push(pkg);
    });
    return pkgs;
}
function resolveRequires(depsMap, pkgs) {
    function getParents(pkg) {
        if (pkg && pkg._parent) {
            return new Set([pkg._parent, ...getParents(pkg._parent)]);
        }
        return new Set();
    }
    pkgs.forEach((pkg) => {
        const parents = getParents(pkg);
        pkg._required_deps = [];
        Object.keys(pkg._requires || {}).sort().forEach((pkgName) => {
            let constraint = pkg._requires[pkgName];
            if (depsMap.has(pkgName)) {
                let satisfies = depsMap.get(pkgName)
                    .filter(dep => semver.satisfies(dep._version, constraint))
                    .filter(dep => !parents.has(dep));
                if (satisfies.length > 0) {
                    pkg._required_deps.push(satisfies[0]);
                    return;
                }
            }
            let _dependencies = pkg._dependencies.filter((dep) => (dep._name == pkgName && semver.satisfies(dep._version, constraint)));
            console_1.assert(_dependencies.length > 0, `Can't resolve ${pkgName}@${constraint}, required by ${depID(pkg)}`);
        });
        pkg._dependencies.forEach(dep => {
            if (depsMap.has(dep._name)) {
                depsMap.get(dep._name).push(dep);
            }
            else {
                depsMap.set(dep._name, [dep]);
            }
        });
        resolveRequires(depsMap, pkg._dependencies.sort());
        pkg._dependencies.forEach(dep => {
            depsMap.get(dep._name).pop();
        });
    });
}
function breakCycles(prefix, pkg) {
    prefix.push(pkg);
    pkg._required_deps.forEach((dep) => {
        for (let i = 0; dep._required_deps && i < dep._required_deps.length; i++) {
            if (prefix.includes(dep._required_deps[i])) {
                log_verbose(`Cycle found: ${pkg._repoName} requires ${dep._repoName}, which requires ${dep._required_deps[i]._repoName}`);
                let depset = new DepSet(dep, new Set(prefix));
                dep._required_deps = [];
                dep._dependencies = depset.depArray();
                break;
            }
        }
        if (dep._required_deps && dep._required_deps.length > 0) {
            breakCycles(prefix, dep);
        }
    });
    prefix.pop();
}
function repoName(pkg) {
    function getSubname(pkg) {
        return `${pkg._name
            .replace(/\@/g, "_at_")
            .replace(/\'/g, "_quote_")
            .replace(/\//g, "_slash_")}__${pkg._version.replace(/\./g, "_")}`;
    }
    function getPrefix(pkg) {
        return pkg._parent ? getPrefix(pkg._parent).concat(getSubname(pkg._parent)) : [];
    }
    const prefix = getPrefix(pkg).join("__");
    if (prefix.length) {
        return `${WORKSPACE}__${prefix}__${getSubname(pkg)}`;
    }
    else {
        return `${WORKSPACE}__${getSubname(pkg)}`;
    }
}
function print_npm_package(pkg) {
    log_verbose(`printing ${depID(pkg)}`);
    const top_level_targets = pkg._required_deps.map((dep) => {
        return `${dep._repoName}//:pkg`;
    });
    const nested_targets = pkg._dependencies.map((dep) => {
        return `${dep._repoName}//:pkg`;
    });
    const required_targets = top_level_targets.concat(nested_targets);
    return `
  if "${pkg._repoName}" not in native.existing_rules():
    install_package(
      name = "${pkg._repoName}",
      pkg = "${pkg._name}",
      version = "${pkg._version}",
      integrity = "${pkg._integrity}",
      url = "${pkg._resolved}",
      required_targets = [${required_targets.map(target => `"@${target}"`).join(",")}],
      **kwargs
    )
` + pkg._dependencies.map((dep) => print_npm_package(dep)).join("");
}
function generatePackagesBzl(pkgs) {
    const packages = pkgs.map((pkg) => print_npm_package(pkg));
    const mappings = pkgs.map((pkg) => `"${pkg._name}": "${pkg._repoName}//:pkg"`);
    return ` # Generated by npm_repositories rule
load("@build_bazel_rules_nodejs//internal/npm_install:npm_repository.bzl", "install_package")

def install_packages(**kwargs):
  ${packages.join("\n")}

_packages = {
  ${mappings.join(",")}
}

all_packages = _packages.values()

def _require(name, target=None):
  name_key = name.lower()
  if name_key not in _packages:
    fail("Could not find npm-provided dependency: '%s'" % name)
  req = _packages[name_key]
  pkg, _, _ = req.partition("//")
  if target != None:
    req = pkg + target
  return req, pkg

def require(name, target=None):
  req, _ = _require(name, target)
  return req

def repo(name):
  _, pkg = _require(name)
  return pkg
`;
}
