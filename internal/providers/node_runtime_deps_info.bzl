# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Custom provider that mimics the Runfiles, but doesn't incur the expense of creating the runfiles symlink tree"""

load("//internal/linker:link_node_modules.bzl", "add_arg", "write_node_modules_manifest")
load("//internal/providers:npm_package_info.bzl", "NpmPackageInfo")

NodeRuntimeDepsInfo = provider(
    doc = """Stores runtime dependencies of a nodejs_binary or nodejs_test

These are files that need to be found by the node module resolver at runtime.

Historically these files were passed using the Runfiles mechanism.
However runfiles has a big performance penalty of creating a symlink forest
with FS API calls for every file in node_modules.
It also causes there to be separate node_modules trees under each binary. This
prevents user-contributed modules passed as deps[] to a particular action from
being found by node module resolver, which expects everything in one tree.

In node, this resolution is done dynamically by assuming a node_modules
tree will exist on disk, so we assume node actions/binary/test executions will
do the same.
""",
    fields = {
        "pkgs": "list of labels of packages that provide NpmPackageInfo",
        "deps": "depset of runtime dependency labels",
    },
)

def run_node(ctx, inputs, arguments, executable, **kwargs):
    """Helper to replace ctx.actions.run
    This calls node programs with a node_modules directory in place"""
    if (type(executable) != "string"):
        fail("""run_node requires that executable be provided as a string,
            eg. my_executable rather than ctx.executable.my_executable
            got %s""" % type(executable))
    exec_attr = getattr(ctx.attr, executable)
    exec_exec = getattr(ctx.executable, executable)

    extra_inputs = []
    link_data = []
    if (NodeRuntimeDepsInfo in exec_attr):
        extra_inputs = exec_attr[NodeRuntimeDepsInfo].deps.to_list()
        link_data = exec_attr[NodeRuntimeDepsInfo].pkgs

    modules_manifest = write_node_modules_manifest(ctx, link_data)
    add_arg(arguments, "--bazel_node_modules_manifest=%s" % modules_manifest.path)
    inputs.append(modules_manifest)

    # By using the run_node helper, you suggest that your program
    # doesn't implicitly use runfiles to require() things
    # To access runfiles, you must use a runfiles helper in the program instead
    add_arg(arguments, "--nobazel_patch_module_resolver")

    env = kwargs.pop("env", {})

    # Always forward the COMPILATION_MODE to node process as an environment variable
    configuration_env_vars = kwargs.pop("configuration_env_vars", []) + ["COMPILATION_MODE"]
    for var in configuration_env_vars:
        if var not in env.keys():
            # If env is not explicitely specified, check ctx.var first & if env var not in there
            # then check ctx.configuration.default_shell_env. The former will contain values from
            # --define=FOO=BAR and latter will contain values from --action_env=FOO=BAR
            # (but not from --action_env=FOO).
            if var in ctx.var.keys():
                env[var] = ctx.var[var]
            elif var in ctx.configuration.default_shell_env.keys():
                env[var] = ctx.configuration.default_shell_env[var]

    # If there are additional repos needed in runtime
    _external_repos = {}
    if "data" in kwargs:
        for d in kwargs.pop("data"):
            if NpmPackageInfo in d:
                for source in d[NpmPackageInfo].sources.to_list():
                    if source.dirname.startswith("external"):
                        module = source.dirname.split("/")[1]
                        if module not in _external_repos:
                            _external_repos[module] = module
    external_repos = _external_repos.keys()

    env["ADDITIONAL_EXTERNAL_REPOS"] = ",".join(external_repos)

    ctx.actions.run(
        inputs = inputs + extra_inputs,
        arguments = arguments,
        executable = exec_exec,
        env = env,
        **kwargs
    )
