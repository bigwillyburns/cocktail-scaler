# Cocktail Scaler (web app)

A home-screen web app for iPhone: build cocktail recipes in ml, oz or dashes,
see the ABV, save them to your Cocktail List and scale them to any batch size.
It's plain HTML/CSS/JS with no build step, and it works offline once loaded.

When you scale a recipe, the **shopping list** tells you which bottles to buy
for each ingredient (e.g. "1 × 1 L + 1 × 375 ml"). The app guesses each
ingredient's type from its name, unit and ABV, and you can tap to change it.
It uses common US or UK/EU retail sizes, which are listed in `bottles.js`.

Recipes are stored on the device in the browser's storage. Use **Export backup**
on the Cocktail List now and then. A backup can be imported on any device.

## Run it locally

```bash
python -m http.server 8080 --directory web
```

Then open http://localhost:8080.

Run the tests for the bottle logic with:

```bash
node --test tests/bottles.test.js
```

## Host it for free

The site has to be served over HTTPS for offline mode and "Add to Home Screen"
to work properly. All of these options give you HTTPS.

### GitHub Pages

1. Create a **public** repository on GitHub and push this project to it.
2. In the repo, go to **Settings → Pages**. Under *Build and deployment*,
   choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute, the app is at `https://<username>.github.io/<repo>/web/`.

(To host from the site root instead, push only the contents of `web/`.)

### Netlify Drop (no git needed)

1. Sign up for a free account at netlify.com.
2. Open https://app.netlify.com/drop and drag the `web` folder onto the page.
3. You get a URL like `https://something.netlify.app`, which you can rename in
   Site settings.

To update the site, drag the folder onto the site's **Deploys** tab again.

## Install it on your iPhone

1. Open the URL in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**.
3. Launch it from the new **Cocktails** icon. It opens full-screen like an app.

## Shipping updates

The app caches itself for offline use. After changing any file, bump `CACHE`
in `sw.js` (for example `cocktail-scaler-v2`). Phones pick up the new
version the second time the app is opened after the update.
