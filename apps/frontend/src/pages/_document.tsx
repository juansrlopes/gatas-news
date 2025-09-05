import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Roboto+Condensed:wght@400;700&display=swap"
            rel="stylesheet"
          />
          <style>{`
            body {
              background: rgb(38,3,74);
              background: linear-gradient(90deg, rgba(38,3,74,1) 35%, rgba(0,0,0,1) 100%);
              font-family: 'Roboto Condensed', sans-serif;
            }
          `}</style>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
