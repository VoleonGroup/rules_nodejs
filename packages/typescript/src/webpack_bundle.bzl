"checked_in_ts_project rule"

load("@build_bazel_rules_nodejs//internal/golden_file_test:golden_file_test.bzl", "golden_file_test")
load("@npm//webpack:index.bzl", "webpack")

def webpack_bundle(name, src, tsconfig, webpack_config, checked_in_js = None, data = []):
    if not checked_in_js:
        checked_in_js = src[:-3] + ".js"

    # generate bundle
    webpack(
        name = name,
        outs = [checked_in_js],
        args = [
            "$(execpath {})".format(src.split(':')[-1]),
            "--config",
            "$(execpath {})".format(webpack_config.split(':')[-1]),
            "-o",
            "$@",
        ],
        data = [
            "@npm//webpack-cli",
            "@npm//@types/node",
            "@npm//ts-loader",
            src,
            webpack_config,
            tsconfig,
        ] + data,
    )

    # Assert that we kept the index.js up-to-date when changing the TS code
    golden_file_test(
        name = "%s_check_compiled" % name,
        actual = "_%s_no_format.js" % name,
        golden = checked_in_js,
    )
