/**
 * Script to set up bazel repositories from a package-lock.json file.
 *
 * The high level idea is to convert the dependency tree encoded in package-lock.json
 * to a flat list of Deps (see below for type definition), while preserving the difference
 * between `requires` (globally dependable) vs `dependencies` (locally dependable) by
 * encoding such information in the name of the repository. (see https://stackoverflow.com/questions/52926922/package-lock-json-requires-vs-dependencies)
 *
 * For example, if a package-lock.json looks like
 *
 * {
 * ...
 *   "dependencies": {
 *     "A": {
 *       "version": "1.0.1",
 *       "requires": {
 *         "B": "^1.2.3",
 *         "C": "^2.1.0",
 *       },
 *       "dependencies": {
 *         "C": {
 *            "version": "2.1.1",
 *            "requires": {
 *              "D": "^4.1.0",
 *              "E": "^3.1.0",
 *            },
 *            "dependencies": {
 *              "E": {
 *                "version": "3.2.3",
 *              }
 *            }
 *         }
 *       }
 *     },
 *     "B": {
 *       "version": "1.5.0",
 *     },
 *     "C": {
 *       "version": "3.0.0",
 *     }
 *     "D": {
 *       "version": "4.2.0",
 *     }
 *   }
 * }
 *
 * The following repositories will be created (assuming WORKSPACE name is "npm")
 *
 * @npm__A__1_0_1, @npm__A__1_0_1__C__2_1_0, @npm__A__1_0_1__C__2_1_0__E__3_2_3, @npm__B__1_5_0, @npm__C__3_0_0, @npm__D__4_2_0,
 *
 * where
 * 1. @npm__A__1_0_1//:pkg depends on
 *      @npm__B__1_5_0//:pkg,
 *      @npm__A__1_0_1__C__2_1_0//:pkg
 * 2. @npm__A__1_0_1__C__2_1_0//:pkg depends on
 *      @npm__D__4_2_0//:pkg,
 *      @npm__A__1_0_1__C__2_1_0__E__3_2_3//pkg
 *
 *
 * Also, given that node.js' `require()` supports circular dependency (I know, I know) whereas bazel
 * doesn't, circular dependencies are resolved by removing the second edge.
 *
 *
 * For example, if package-lock.json looks like
 *
 * {
 * ...
 *   "dependencies": {
 *     "A": {
 *       "version": "1.0.1",
 *       "requires": {
 *         "B": "^1.2.3",
 *         "C": "^2.1.0",
 *       },
 *       "dependencies": {
 *         "C": {
 *            "version": "2.1.1",
 *            "requires": {
 *              "A": "^1.0.0",
 *              "E": "^3.1.0",
 *            },
 *            "dependencies": {
 *              "E": {
 *                "version": "3.2.3",
 *              }
 *            }
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * The following repositories will be created (assuming WORKSPACE name is "npm")
 *
 * @npm__A__1_0_1, @npm__A__1_0_1__C__2_1_0, @npm__A__1_0_1__C__2_1_0__E__3_2_3,
 *
 * where
 * 1. @npm__A__1_0_1//:pkg depends on
 *      @npm__B__1_5_0//:pkg,
 *      @npm__A__1_0_1__C__2_1_0//:pkg
 * 2. @npm__A__1_0_1__C__2_1_0//:pkg only depends on
 *      @npm__A__1_0_1__C__2_1_0__E__3_2_3//pkg
 *
 * Note that the edge from C->A is omitted, this is safe because
 * "@npm__A__1_0_1__C__2_1_0" is never directly used and thus when "require(A)"
 * is invoked inside of "C", A will always be present in "../../node_modules"
 *
 *
 */

"use strict";

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as semver from "semver";
import { strict as assert } from 'assert';

function log_verbose(...m: any[]) {
  if (!!process.env["VERBOSE_LOGS"]) {
    console.error("[npm_repository.ts]", ...m);
  }
}

const [WORKSPACE, LOCK_FILE_PATH] = process.argv.slice(2,4)

type Dep = {
  _name: string;
  _repoName: string;
  _version: string;
  _resolved: string;
  _integrity: string;
  _requires: any;
  _parent: Dep | null;
  _dependencies: Dep[];
  _required_deps: Dep[];
  [k: string]: any;
};

function depID(dep: Dep) {
  return `${dep._name}@${dep._version}`;
}

/**
 * DepSet is a collection of isolated Deps (no inter-dependencies) with one common parent
 */
class DepSet {
  parent: Dep;
  depmap: Map<string, Dep>;
  packages: Set<string>;

  static clone = function(dep: Dep) {
    let clone: any = {};
    clone._name = dep._name;
    clone._version = dep._version;
    clone._integrity = dep._integrity;
    clone._resolved = dep._resolved;
    clone._dependencies = [];
    clone._required_deps = [];
    clone._parent = null;
    return clone as Dep;
  }

  static extractDep = function(prefix: Set<Dep>, dep: Dep): [Map<string, Dep>, Set<string>] {
    let depmap: Map<string, Dep> = new Map();
    let packages: Set<string> = new Set();
    prefix.add(dep);

    let allReqs = (dep._required_deps || []).filter(req => !prefix.has(req));
    allReqs = allReqs.concat((dep._required_deps || []).filter(req => !prefix.has(req)));

    allReqs.forEach(req => {
      let reqdeps: Map<string, Dep>, reqpacs: Set<string>;
      [reqdeps, reqpacs] = DepSet.extractDep(prefix, req);
      reqpacs.forEach((pac: string) => {
        if (!packages.has(pac)) {
          packages.add(pac);
          depmap.set(pac, reqdeps.get(pac)!);
        }
      })
      packages.add(depID(req));
      depmap.set(depID(req), DepSet.clone(req));
    })

    prefix.delete(dep);
    return [depmap, packages];
  }

  // Create a depset from a Dep
  public constructor(start: Dep, prefix: Set<Dep>) {
    log_verbose(`Creating Depset for ${depID(start)}: ${start._repoName}`);
    this.parent = start;
    [this.depmap, this.packages] = DepSet.extractDep(prefix, start);
    this.depmap.forEach((dep: Dep) => {
      this.parentify(dep);
    });
    log_verbose(`Depset created for ${depID(start)}:`);
    this.depmap.forEach((dep: Dep) => {
      log_verbose(`${depID(dep)}: ${dep._repoName}`);
    });
  }

  private parentify(dep: Dep): Dep {
    dep._parent = this.parent;
    dep._repoName = repoName(dep);
    return dep;
  }

  // Add other dep to the depset
  public add(other: Dep) {
    if (!this.packages.has(depID(other))) {
      this.packages.add(depID(other));
      this.depmap.set(depID(other), this.parentify(DepSet.clone(other)));
    }
  }

  // Merge with other depset
  public merge(other: DepSet) {
    other.depmap.forEach(dep => {
      this.add(dep);
    })
  }

  // Return all deps as an array
  public depArray() {
    return Array.from(this.depmap.values());
  }
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
  log_verbose(`writing to ${p}`);
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content);
  log_verbose(`write to ${p} finished`);
}

export function main() {
  // find all packages
  const pkgs = findPackages(LOCK_FILE_PATH);

  // create name -> Dep mapping
  const topLevelMapping: Map<string, [Dep]> = new Map();
  pkgs.forEach(pkg => {
    assert(!topLevelMapping.has(pkg._name), `${pkg._name} already exists!`);
    topLevelMapping.set(pkg._name, [pkg]);
    }
  )

  resolveRequires(topLevelMapping, pkgs)

  pkgs.forEach(pkg => {
    breakCycles([], pkg);
  })

  // flatten the list
  const allPkgs = flattenDependencies(pkgs);

  // topologically sort the packages and write to packages.bzl
  writeFileSync("packages.bzl", generatePackagesBzl(pkgs, topoSort(allPkgs)));

  // write a .bazelignore file
  writeFileSync(".bazelignore", "node_modules");

  // write a BUILD file
  writeFileSync("BUILD", "");
}


/**
 * Find all packages from package_lock.json
 */
function findPackages(packageLock: string): Dep[] {
  const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
  let lockData = JSON.parse(
    stripBom(fs.readFileSync(packageLock, { encoding: "utf8" }))
  );

  return extractPackages(null, lockData.dependencies);
}

/**
 * Extract packages from lock file data
 */
function extractPackages(parent: Dep | null, dependencies: any): Dep[] {
  const pkgs: Dep[] = [];
  const deps = dependencies || [];
  Object.keys(deps).forEach((name: string) => {
    let pkg = <any>{};
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

    pkgs.push(pkg);
  });

  return pkgs;
}


/**
 * Resolve package requirements in packages to Deps in the following way:
 * 1. For every package P in the given list, go through its _requires field
 * 2. For every required package Q, if there's a top-level dependency that satisfy the
 *    version requirement, and if it's not a parent Dep, add it to its _required_deps.
 * 3. Otherwise, check if _dependencies contains a Dep that meets Q's requirement, assert if
 *    otherwise
 * 4. Do the same for all of P's _dependencies
 */
function resolveRequires(depsMap: Map<string, [Dep]>, pkgs: Dep[]) {
  function getParents(pkg: Dep | null | undefined): Set<Dep> {
    if (pkg && pkg._parent) {
      return new Set([pkg._parent, ...getParents(pkg._parent)]);
    }
    return new Set();
  }
  pkgs.forEach((pkg: Dep) => {
    const parents = getParents(pkg);
    pkg._required_deps = [];
    Object.keys(pkg._requires || {}).sort().forEach((pkgName: string) => {
      let constraint: string = pkg._requires[pkgName];
      if (depsMap.has(pkgName)) {
        let satisfies = depsMap.get(pkgName)!
                        .filter(dep => semver.satisfies(dep._version, constraint))
                        .filter(dep => !parents.has(dep));
        if (satisfies.length > 0) {
          pkg._required_deps.push(satisfies[0]);
          return;
        }
      } else {
        const _dependencies = pkg._dependencies.filter((dep: Dep) => {
          return dep._name === pkgName && semver.satisfies(dep._version, constraint)});
        assert(_dependencies.length > 0, `Can't resolve ${pkgName}@${constraint}, required by ${depID(pkg)}\n_dependencies:${pkg._dependencies}\nrequires:${pkg._requires}\ndependencies:${pkg.dependencies}`)
      }
    })
    // Add dependencies to available Deps
    pkg._dependencies.forEach(dep => {
      if (depsMap.has(dep._name)) {
        depsMap.get(dep._name)!.push(dep);
      } else {
        depsMap.set(dep._name, [dep]);
      }
    })
    resolveRequires(depsMap, pkg._dependencies.sort());
    // Pop them
    pkg._dependencies.forEach(dep => {
      depsMap.get(dep._name)!.pop();
    })
  })
}


/**
 * Break circular dependency (only for top-level dependency) by making duplications, e.g.,
 * A->B->C->A becomes A->B->C->A'->B'
 */
function breakCycles(prefix: Dep[], pkg: Dep) {
  prefix.push(pkg);
  pkg._required_deps.forEach((dep: Dep) => {
    for (let i = 0; dep._required_deps && i < dep._required_deps.length; i++) {
      if (prefix.includes(dep._required_deps[i])) {
        log_verbose(`Cycle found: ${pkg._repoName} requires ${dep._repoName}, which requires ${dep._required_deps[i]._repoName}`)
        let depset: DepSet = new DepSet(dep, new Set(prefix));
        dep._required_deps = [];
        dep._dependencies = depset.depArray();
        break;
      }
    }
    // if no cycle found here, go deeper
    if (dep._required_deps && dep._required_deps.length > 0) {
      breakCycles(prefix, dep);
    }
  })
  prefix.pop();
}


/**
 * Given a package and a version, return a repository name. The repo name is constructed
 * in the following way:
 * 1. Escape package name in a way that's compatible with bazel repository name and can be
 *    reconstructed later.
 * 2. Concatenate package name with version
 * 3. Prepend workspace name to the repository name if no parent
 * 4. Prepend parent name to the repository name
 */
function repoName(pkg: Dep): string {
  function getSubname(pkg: Dep): string {
    return `${pkg._name
      .replace(/\@/g, "_at_")
      .replace(/\'/g, "_quote_")
      .replace(/\//g, "_slash_")}__${pkg._version.replace(/\./g, "_")}`;
  }
  function getPrefix(pkg: Dep): string[] {
    return pkg._parent ? getPrefix(pkg._parent).concat(getSubname(pkg._parent)) : [];
  }
  const prefix: string = getPrefix(pkg).join("__");
  if (prefix.length) {
    return `${WORKSPACE}__${prefix}__${getSubname(pkg)}`
  } else {
    return `${WORKSPACE}__${getSubname(pkg)}`
  }
}


/**
 * Given a list of packages, create a flattened list of packages where nested dependencies
 * are included as well.
 */
function flattenDependencies(pkgs: Dep[]): Dep[] {
  const flattenList: Dep[] = [];

  pkgs.forEach((pkg: Dep) => {
    flattenList.push(pkg);
    flattenList.push(...flattenDependencies(pkg._dependencies));
  })

  return flattenList;
}


/**
 * Run topological sort on the packages
 */
function topoSort(pkgs: Dep[]): Dep[] {
  const sortedPkgs: Dep[] = [];
  const pkgsWithNoEdges: Dep[] = [];
  const graph: Map<Dep, Set<Dep>> = new Map();

  // construct the graph
  pkgs.forEach((pkg: Dep) => {
    pkg._dependencies.forEach((dep: Dep) => {
      if (graph.has(pkg)) {
        graph.get(pkg).add(dep);
      } else {
        graph.set(pkg, new Set([dep]));
      }
    })
    pkg._required_deps.forEach((dep: Dep) => {
      if (graph.has(pkg)) {
        graph.get(pkg).add(dep);
      } else {
        graph.set(pkg, new Set([dep]));
      }
    })
  })

  // find packages with no deps
  pkgs.forEach((pkg: Dep) => {
    if (pkg._dependencies.length == 0 && pkg._required_deps.length == 0) {
      pkgsWithNoEdges.push(pkg);
    }
  })

  // Kahn's algorithm for topological sort
  while (pkgsWithNoEdges.length > 0) {
    let node = pkgsWithNoEdges.pop();
    sortedPkgs.push(node);
    for (let [p, dependencies] of graph) {
      if (dependencies.has(node)) {
        dependencies.delete(node);
        if (dependencies.size == 0) {
          pkgsWithNoEdges.push(p);
        }
      }
    }
  }

  // sanity checks
  for (let [p, dependencies] of graph) {
    assert(dependencies.size == 0, `There're still edges left after topological sort, there must be an cycle.
Edges:
${p._repoName}->${[...dependencies].map(dep => dep._name).join(",")}
`)
  }

  return sortedPkgs;
}


/**
 * Given a package, return a string used for installing it as a repository in bazel.
 */
function print_npm_package(pkg: Dep): string {
  log_verbose(`printing ${depID(pkg)}`)
  const top_level_targets: string[] = pkg._required_deps.map((dep: Dep) => {
    return `${dep._repoName}//:pkg`;
  });
  const nested_targets: string[] = pkg._dependencies.map((dep: Dep) => {
    return `${dep._repoName}//:pkg`
  })
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
`
}


/**
 * Generate packages.bzl where we declare all repositories but only expose
 * explicitly required packages (first level in packages.json) via `require`
 */
function generatePackagesBzl(pkgs: Dep[], allPkgs: Dep[]): string {
  const packages = allPkgs.map((pkg) => print_npm_package(pkg));
  const mappings = pkgs.map(
    (pkg) => `"${pkg._name}": "${pkg._repoName}//:pkg"`
  );
  return `# Generated by npm_repositories rule
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

main();
