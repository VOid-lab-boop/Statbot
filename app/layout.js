export const metadata = {
  title: "StatBot — R Code Generator",
  description: "Upload data, describe your analysis, get precise R code instantly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
