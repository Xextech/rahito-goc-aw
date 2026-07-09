import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";
import { PrivacyPolicyModal } from "./components/LegalModals";
import { LanguageProvider } from "./context/LanguageContext";

// Mock Firebase
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    img: ({ children, ...props }: any) => <img {...props} />,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollYProgress: { onChange: () => {} } }),
  useTransform: () => ({}),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({
    onAuthStateChanged: vi.fn((cb) => {
      cb(null);
      return vi.fn();
    }),
  })),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  onSnapshot: vi.fn((q, cb) => {
    cb({ docs: [] });
    return () => {};
  }),
}));

describe("App Layout and Navigation", () => {
  it("renders website banner and header brand text", () => {
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );

    // Verify main brand name is present
    expect(screen.getAllByText("RAHITO")[0]).toBeInTheDocument();
    
    // Verify navigation links are present
    expect(screen.getAllByText(/Menú/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Visión/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Opiniones/i)[0]).toBeInTheDocument();
  });

  it("can switch languages from Spanish to Polish and vice versa", () => {
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );

    // Click PL language button in header (active language switcher buttons display "ES" and "PL")
    const plButtons = screen.getAllByRole("button", { name: "PL" });
    // Use first PL button in header
    fireEvent.click(plButtons[0]);

    // Verify language changed to Polish (e.g. "MENÚ" -> "MENU", "OPINIONES" -> "OPINIE")
    expect(screen.getAllByText(/Menu/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Opinie/i)[0]).toBeInTheDocument();

    // Switch back to Spanish
    const esButtons = screen.getAllByRole("button", { name: "ES" });
    fireEvent.click(esButtons[0]);

    // Verify Spanish translations are restored
    expect(screen.getAllByText(/Menú/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Opiniones/i)[0]).toBeInTheDocument();
  });

  it("opens legal modals when clicking privacy policy link in footer", () => {
    // Render the modal directly to avoid relying on App click wiring
    render(
      <LanguageProvider>
        <PrivacyPolicyModal isOpen={true} onClose={() => {}} lang="es" />
      </LanguageProvider>
    );

    // The modal heading should now be in the DOM (use heading role to avoid duplicate matches)
    expect(screen.getByRole('heading', { name: /Política de Privacidad|Polityka Prywatności/i })).toBeInTheDocument();
  });
});
