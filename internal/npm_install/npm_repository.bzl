"""Creat bazel repositories for each npm package

Only support npm + linux.
"""

load("//internal/node:node_labels.bzl", "get_node_label")

NPM_REPOSITORY_ATTRS = {
    "args": attr.string_list(
        doc = """Arguments passed to npm install.

See npm CLI docs https://docs.npmjs.com/cli/install.html for complete list of supported arguments.""",
        default = [],
    ),
    "package_json": attr.label(
        mandatory = True,
        allow_single_file = True,
    ),
    "package_lock_json": attr.label(
        mandatory = True,
        allow_single_file = True,
    ),
    "_script": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/npm_install:npm_repository.js"),
        doc = "Script to set up repository for each npm package",
    ),
}

def _npm_repositories_impl(repository_ctx):
    """Implementation of npm_repositories"""
    node = repository_ctx.path(get_node_label(repository_ctx))
    script = repository_ctx.path(repository_ctx.attr._script)
    lock_file = repository_ctx.path(repository_ctx.attr.package_lock_json)
    print("%s %s %s %s" % (node, script, repository_ctx.attr.name, lock_file))
    result = repository_ctx.execute(
        [node, script, repository_ctx.attr.name, lock_file],
    )
    if result.return_code:
        fail("setting up npm repositories failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

npm_repositories = repository_rule(
    attrs = NPM_REPOSITORY_ATTRS,
    doc = "Repository rule to set up bazel repositories given a package.json and package-lock.json",
    implementation = _npm_repositories_impl,
    configure = True,
)

INSTALL_PCKAGE_ATTRS = {
    "timeout": attr.int(
        default = 600,
        doc = "number of seconds before timing out when installing an npm package",
    ),
    "cert": attr.string(
        doc = "path to CA certificate",
    ),
    "integrity": attr.string(
        mandatory = True,
        doc = "subresource integrity",
    ),
    "pkg": attr.string(
        mandatory = True,
        doc = "npm package name",
    ),
    "required_targets": attr.string_list(
        allow_empty = True,
        doc = "list of other npm package targets",
    ),
    "url": attr.string(
        mandatory = True,
        doc = "url to download npm package",
    ),
    "version": attr.string(
        mandatory = True,
        doc = "npm package version",
    ),
    "_script": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/npm_install:install_package.js"),
        doc = "Script to install an npm package as a bazel repository",
    ),
}

def _install_package_impl(repository_ctx):
    """Implementation of npm_repositories"""
    node = repository_ctx.path(get_node_label(repository_ctx))
    script = repository_ctx.path(repository_ctx.attr._script)
    name = repository_ctx.attr.name
    pkg = repository_ctx.attr.pkg
    version = repository_ctx.attr.version
    url = repository_ctx.attr.url
    integrity = repository_ctx.attr.integrity
    required_targets = repository_ctx.attr.required_targets

    result = repository_ctx.execute(
        [node, script, name, pkg, version, url, integrity, ",".join(required_targets)],
        environment = {"NODE_EXTRA_CA_CERTS": repository_ctx.attr.cert},
        timeout = repository_ctx.attr.timeout,
    )
    if result.return_code:
        fail("Installing npm package %s failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (name, result.stdout, result.stderr))

install_package = repository_rule(
    attrs = INSTALL_PCKAGE_ATTRS,
    doc = "Repository rule to install an npm package as a bazel repository",
    implementation = _install_package_impl,
    configure = True,
)
