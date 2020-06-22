"""Creat bazel repositories for each npm package

Only support npm + linux.
"""

load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label")

NPM_REPOSITORY_ATTRS = {
    "package_json": attr.label(
        mandatory = True,
        allow_single_file = True,
    ),
    "args": attr.string_list(
        doc = """Arguments passed to npm install.

See npm CLI docs https://docs.npmjs.com/cli/install.html for complete list of supported arguments.""",
        default = [],
    ),
    "package_lock_json": attr.label(
        mandatory = True,
        allow_single_file = True,
    ),
    "_script": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/npm_install:npm_repository.js"),
        doc = "Script to set up repository for each npm package"
    )
}

def _npm_repositories_impl(repository_ctx):
    """Implementation of npm_repositories"""
    node = repository_ctx.path(get_node_label(repository_ctx))
    script = repository_ctx.path(repository_ctx.attr._script)
    lock_file = repository_ctx.path(repository_ctx.attr.package_lock_json)
    print("executing %s %s %s %s" % (node, script, repository_ctx.attr.name, lock_file))
    result = repository_ctx.execute(
        [node, script, repository_ctx.attr.name, lock_file]
    )
    if result.return_code:
        fail("setting up npm repositories failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))


npm_repositories = repository_rule(
    attrs = NPM_REPOSITORY_ATTRS,
    doc = """TBD""",
    implementation = _npm_repositories_impl,
    configure = True,
)

