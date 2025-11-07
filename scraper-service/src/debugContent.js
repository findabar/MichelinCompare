const { LocationUpdater } = require('./locationUpdater');

// Debug what content is actually being sent to AI
async function debugContent() {
  console.log('🔍 Debugging content sent to AI');
  console.log('='.repeat(80));

  const updater = new LocationUpdater();

  try {
    await updater.init();

    const restaurantName = 'Alinea';
    const searchUrl = `https://guide.michelin.com/gb/en/restaurants?q=${encodeURIComponent(restaurantName)}`;

    const page = await updater.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`🔍 Loading: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const pageContent = await page.content();
    console.log(`📝 Original page content length: ${pageContent.length} characters`);

    // Filter out "Nearby Restaurants" section
    let filteredContent = pageContent;
    const nearbyRestaurantsIndex = pageContent.indexOf('<h2 class="section__heading section__heading_title">\n                        Nearby Restaurants\n                    </h2>');
    if (nearbyRestaurantsIndex !== -1) {
      filteredContent = pageContent.substring(0, nearbyRestaurantsIndex);
      console.log(`📝 After filtering: ${filteredContent.length} characters`);
    }

    // Strip HTML tags
    const stripHtmlTags = (html) => {
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    };

    const cleanContent = stripHtmlTags(filteredContent);
    console.log(`📝 After HTML stripping: ${cleanContent.length} characters`);

    // Show relevant excerpt around restaurant name
    const searchIndex = cleanContent.toLowerCase().indexOf(restaurantName.toLowerCase());
    if (searchIndex !== -1) {
      const start = Math.max(0, searchIndex - 200);
      const end = Math.min(cleanContent.length, searchIndex + 500);
      const excerpt = cleanContent.substring(start, end);

      console.log(`\n📋 Content around "${restaurantName}":`);
      console.log('='.repeat(50));
      console.log(excerpt);
      console.log('='.repeat(50));
    }

    // Also show first 1000 characters
    console.log(`\n📋 First 1000 characters of clean content:`);
    console.log('='.repeat(50));
    console.log(cleanContent.substring(0, 1000));
    console.log('='.repeat(50));

    await page.close();

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (updater.browser) {
      await updater.browser.close();
    }
  }
}

// Run the debug
if (require.main === module) {
  debugContent()
    .then(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}