// Vercel Serverless Function to proxy Webflow content and strip X-Frame-Options
// This allows iframe embedding in production

export default async function handler(req, res) {
  // Get the path from query parameter
  const { path = '/' } = req.query;
  
  // Construct the full Webflow URL
  const targetUrl = `https://reno-v1.webflow.io${path}`;
  
  try {
    // Fetch the content from Webflow
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.5',
      },
    });

    // Get the content
    const content = await response.text();
    
    // Forward content type
    const contentType = response.headers.get('content-type') || 'text/html';
    
    // Set response headers - explicitly remove frame-blocking headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Explicitly allow framing
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    
    // Return the content
    res.status(response.status).send(content);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch content', details: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
