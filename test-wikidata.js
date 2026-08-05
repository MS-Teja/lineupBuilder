async function searchWikidata(query) {
  // 1. Search Wikipedia for page titles
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' footballer')}&utf8=&format=json&origin=*`;
  const res = await fetch(searchUrl);
  const data = await res.json();
  if (!data.query.search.length) return console.log('No results');

  // 2. Get Wikidata item IDs for the top 3 Wikipedia pages
  const titles = data.query.search.slice(0,3).map(s => s.title).join('|');
  const propUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item|page_image_free&titles=${encodeURIComponent(titles)}&format=json&origin=*`;
  const propRes = await fetch(propUrl);
  const propData = await propRes.json();
  
  // Extract item IDs
  const qIds = Object.values(propData.query.pages)
    .map(p => p.pageprops?.wikibase_item)
    .filter(Boolean);

  if (!qIds.length) return console.log('No wikidata items');

  // 3. Query Wikidata for structured data (club, country, position, image)
  const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qIds.join('|')}&props=claims|labels&languages=en&format=json&origin=*`;
  const wdRes = await fetch(wdUrl);
  const wdData = await wdRes.json();
  
  for (const id of qIds) {
    const entity = wdData.entities[id];
    if (!entity) continue;
    const name = entity.labels?.en?.value;
    
    const getClaim = (prop) => {
      const claim = entity.claims[prop]?.[0]?.mainsnak?.datavalue?.value;
      return claim?.id || claim; // return ID if item, string if value
    };
    
    const imageFilename = getClaim('P18'); 
    let imageUrl = null;
    if (imageFilename) {
      const md5 = require('crypto').createHash('md5').update(imageFilename.replace(/ /g, '_')).digest('hex');
      imageUrl = `https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${encodeURIComponent(imageFilename.replace(/ /g, '_'))}`;
    }
    
    console.log({
      name,
      imageUrl,
      clubId: getClaim('P54'),
      countryId: getClaim('P27'),
      positionId: getClaim('P413')
    });
  }
}
searchWikidata('erling haaland').catch(console.error);
