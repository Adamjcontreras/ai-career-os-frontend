export const metadata = {
  title: "AI Career OS",
  description: "Your AI-powered career operating system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F4F0E7" }}>{children}</body>
    </html>
  );
}
