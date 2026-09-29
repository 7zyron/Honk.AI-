import { TechnicalSeoReport } from './imports/types';

/**
 * HONK Technical SEO Analyzer & Optimizer
 * Scans HTML and React code for standards-compliant metadata, crawlability, and OpenGraph.
 * Provides honest diagnostic evaluation: "Technical SEO optimized" (never false ranking guarantees).
 */

export function analyzeTechnicalSeo(files: Record<string, string>): TechnicalSeoReport {
  const htmlContent = files['index.html'] || files['public/index.html'] || '';
  const robotsContent = files['public/robots.txt'] || files['robots.txt'] || '';
  const sitemapContent = files['public/sitemap.xml'] || files['sitemap.xml'] || '';

  const suggestions: string[] = [];
  let score = 0;

  // 1. Page Title
  const titleMatch = htmlContent.match(/<title>([^<]*)<\/title>/i);
  const hasTitle = Boolean(titleMatch && titleMatch[1].trim().length > 0);
  const titleContent = titleMatch ? titleMatch[1].trim() : undefined;
  if (hasTitle) {
    score += 15;
    if (titleContent && (titleContent.length < 10 || titleContent.length > 70)) {
      suggestions.push('Title tag is present, but recommended length is 30-60 characters for optimal search snippet display.');
    }
  } else {
    suggestions.push('Missing <title> tag in index.html. Add a concise, descriptive title.');
  }

  // 2. Meta Description
  const descMatch = htmlContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                    htmlContent.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const hasMetaDescription = Boolean(descMatch && descMatch[1].trim().length > 0);
  const descriptionContent = descMatch ? descMatch[1].trim() : undefined;
  if (hasMetaDescription) {
    score += 15;
    if (descriptionContent && (descriptionContent.length < 50 || descriptionContent.length > 160)) {
      suggestions.push('Meta description should be between 70-155 characters for optimal snippet readability.');
    }
  } else {
    suggestions.push('Missing meta description tag. Add <meta name="description" content="...">.');
  }

  // 3. Open Graph Metadata
  const hasOgTitle = /<meta\s+(?:property|name)=["']og:title["']/i.test(htmlContent);
  const hasOgDesc = /<meta\s+(?:property|name)=["']og:description["']/i.test(htmlContent);
  const hasOgImage = /<meta\s+(?:property|name)=["']og:image["']/i.test(htmlContent);
  const hasOpenGraph = hasOgTitle && hasOgDesc;
  if (hasOpenGraph) {
    score += 15;
  } else {
    suggestions.push('Missing complete Open Graph social card tags (og:title, og:description, og:image).');
  }

  // 4. Twitter Cards
  const hasTwitterCard = /<meta\s+(?:name|property)=["']twitter:card["']/i.test(htmlContent);
  if (hasTwitterCard) {
    score += 10;
  } else {
    suggestions.push('Add Twitter card meta tags (twitter:card, twitter:title) for high-impact social preview cards.');
  }

  // 5. Canonical URL
  const hasCanonical = /<link\s+rel=["']canonical["']/i.test(htmlContent);
  if (hasCanonical) {
    score += 10;
  } else {
    suggestions.push('Add a canonical link tag (<link rel="canonical" href="...">) to prevent duplicate content issues.');
  }

  // 6. Robots.txt
  const hasRobotsTxt = robotsContent.trim().length > 0;
  if (hasRobotsTxt) {
    score += 10;
  } else {
    suggestions.push('Missing robots.txt crawler instruction file in the public directory.');
  }

  // 7. Sitemap.xml
  const hasSitemap = sitemapContent.trim().length > 0;
  if (hasSitemap) {
    score += 10;
  } else {
    suggestions.push('Missing sitemap.xml for search engine indexing.');
  }

  // 8. Structured Data (Schema.org JSON-LD)
  const hasStructuredData = /<script\s+type=["']application\/ld\+json["']/i.test(htmlContent);
  if (hasStructuredData) {
    score += 5;
  } else {
    suggestions.push('Consider adding Schema.org JSON-LD structured data (WebApplication / SoftwareApplication).');
  }

  // 9. Semantic Headings
  const hasH1 = /<h1[^>]*>/i.test(htmlContent) || Object.values(files).some(c => /<h1[^>]*>/i.test(c));
  const hasSemanticHeadings = hasH1;
  if (hasSemanticHeadings) {
    score += 5;
  } else {
    suggestions.push('Ensure the application has a clear single <h1> primary heading on the landing view.');
  }

  // 10. Mobile Responsiveness
  const hasViewport = /<meta\s+name=["']viewport["']/i.test(htmlContent);
  const isMobileResponsive = hasViewport;
  if (isMobileResponsive) {
    score += 5;
  } else {
    suggestions.push('Missing <meta name="viewport" content="width=device-width, initial-scale=1.0"> tag.');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    hasTitle,
    titleContent,
    hasMetaDescription,
    descriptionContent,
    hasOpenGraph,
    hasTwitterCard,
    hasCanonical,
    hasRobotsTxt,
    hasSitemap,
    hasStructuredData,
    hasSemanticHeadings,
    isMobileResponsive,
    suggestions,
  };
}

export function applyTechnicalSeoOptimization(
  files: Record<string, string>,
  appName: string,
  appDescription: string
): Record<string, string> {
  const updatedFiles = { ...files };
  const sanitizedName = appName || 'HONK Application';
  const sanitizedDesc = appDescription || 'Modern, interactive web application built and managed with HONK.';

  let html = updatedFiles['index.html'] || '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';

  // Inject or update Viewport
  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head>/i, '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  }

  // Update or inject Title
  if (/<title>.*?<\/title>/i.test(html)) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${sanitizedName} — Fast, Accessible Web App</title>`);
  } else {
    html = html.replace(/<head>/i, `<head>\n  <title>${sanitizedName} — Fast, Accessible Web App</title>`);
  }

  // Inject or update Meta Description
  if (!/<meta\s+name=["']description["']/i.test(html)) {
    html = html.replace(/<head>/i, `<head>\n  <meta name="description" content="${sanitizedDesc}" />`);
  }

  // Inject Canonical & Open Graph & Twitter & Structured Data
  const seoTags = `
  <!-- Technical SEO & Social Cards -->
  <link rel="canonical" href="https://honk-app.ai/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${sanitizedName}" />
  <meta property="og:description" content="${sanitizedDesc}" />
  <meta property="og:site_name" content="Honk Apps" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizedName}" />
  <meta name="twitter:description" content="${sanitizedDesc}" />
  <meta name="robots" content="index, follow" />
  
  <!-- Structured Data (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${sanitizedName}",
    "description": "${sanitizedDesc}",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "All modern browsers"
  }
  </script>`;

  if (!html.includes('<!-- Technical SEO & Social Cards -->')) {
    html = html.replace(/<\/head>/i, `${seoTags}\n</head>`);
  }

  updatedFiles['index.html'] = html;

  // Generate robots.txt
  updatedFiles['public/robots.txt'] = `# HONK Application Crawler Directives
User-agent: *
Allow: /

Sitemap: https://honk-app.ai/sitemap.xml
`;

  // Generate sitemap.xml
  const currentDate = new Date().toISOString().split('T')[0];
  updatedFiles['public/sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://honk-app.ai/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

  return updatedFiles;
}
