const { DateTime } = require('luxon');
const htmlmin = require('html-minifier');

const markdown = require('./lib/markdown');
const manifestFilter = require('./lib/manifestFilter');
const pageCollection = require('./lib/pageCollection');
const selectChildren = require('./lib/selectChildren');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const options = require('./_data/options');
const site = require('./_data/site');

module.exports = function (config) {
  // Copy folders and files.
  config.addPassthroughCopy('build');

  // Filters.
  config.addFilter('manifest', manifestFilter);
  config.addFilter('selectChildren', selectChildren);

  /**
   * Date string for Sitemap.
   *
   * @link https://github.com/11ty/eleventy-base-blog/blob/master/.eleventy.js
   */
  config.addFilter('htmlDateString', (dateObj) => {
    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy-LL-dd');
  });

  config.addNunjucksGlobal('getCurrentVersion', function (version, versions) {
    return versions.find((v) => v.value === version);
  });

  config.addNunjucksGlobal('getOtherVersions', function (version, versions) {
    return versions.filter((v) => v.value !== version);
  });

  // Plugins
  config.addPlugin(require('eleventy-plugin-toc'));
  // Required for sitemap.
  config.addPlugin(pluginRss);

  config.setLibrary('md', markdown);

  /**
   * Minify the output
   *
   * @link https://www.11ty.dev/docs/config/#transforms-example-minify-html-output
   */
  config.addTransform('htmlmin', function (content, outputPath) {
    if (outputPath.endsWith('.html')) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }

    return content;
  });

  site.versions.forEach((version) => {
    config.addCollection(version.slug, function (collection) {
      return pageCollection(collection, version.glob);
    });

    if (version.slug === 'v1') {
      config.addCollection('v1redirects', function (collection) {
        let redirects = collection.getFilteredByGlob(version.glob);

        // Filter out index.
        redirects = redirects.filter(
          (item) => item.filePathStem !== '/v1/index',
        );

        redirects = redirects.map((item) => {
          // Previously, the v1 docs lived in a non-versioned folder (e.g. timber.github.io/docs/getting-started/setup/). Now, we take the v1 URLs as a basis for redirects from
          // that no-versioned folder to the latest version. This might lead to 404s, but we will
          // live with that for the moment.
          return {
            from: item.url.replace('/v1', ''),
            to: item.url.replace('/v1', `/${site.versions[0].slug}`),
          };
        });

        return redirects;
      });
    }
  });

  return options;
};
