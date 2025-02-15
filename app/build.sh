bun run build

mv dist/assets/index-*.js dist/assets/index.js
mv dist/assets/index-*.css dist/assets/index.css

sed -i 's|<script type="module" crossorigin src="/assets/index-[^"]*.js"></script>|<script type="module" crossorigin src="assets/index.js"></script>|' dist/index.html 
sed -i 's|<link rel="stylesheet" crossorigin href="/assets/index-[^"]*.css">|<link rel="stylesheet" crossorigin href="assets/index.css">|' dist/index.html

rm -rf ../assets ../favicon.ico ../index.html

mv dist/* ../

rm -rf dist
