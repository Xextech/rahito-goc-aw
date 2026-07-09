import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReservationForm from "./ReservationForm";
import { LanguageProvider } from "../context/LanguageContext";

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

// ReservationForm now talks to the server exclusively via fetch — no
// direct Firestore access from the browser (availability + booking are
// both server-mediated to keep personal data off the client).
const mockPostResult = { id: "mock-booking-id-12345", date: "2026-07-10", time: "19:00", guests: 2, tableName: "Mesa 1", type: "table" };
const mockFetch = vi.fn((url: string, init?: RequestInit) => {
  if (typeof url === "string" && url.startsWith("/api/availability")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tables: [], reservationsByDate: {} }),
    } as any);
  }
  if (typeof url === "string" && url.startsWith("/api/reservations") && init?.method === "POST") {
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockPostResult),
    } as any);
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as any);
});
global.fetch = mockFetch as any;

describe("ReservationForm Booking Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithLanguage = () => {
    return render(
      <LanguageProvider>
        <ReservationForm />
      </LanguageProvider>
    );
  };

  it("renders Step 1 with date, time slot, and guest selection", () => {
    renderWithLanguage();

    expect(screen.getByText(/Calendario|Wybór/i)).toBeInTheDocument();

    // Proceed button is disabled because no time slot is selected yet
    const proceedBtn = screen.getByRole("button", { name: /Continuar|Przejdź/i });
    expect(proceedBtn).toBeDisabled();
  });

  it("enables proceed button when a time slot is selected and transitions to Step 2", () => {
    renderWithLanguage();

    const timeSlotBtn = screen.getByText("19:00");
    fireEvent.click(timeSlotBtn);

    const proceedBtn = screen.getByRole("button", { name: /Continuar|Przejdź/i });
    expect(proceedBtn).toBeEnabled();

    fireEvent.click(proceedBtn);

    expect(screen.getByText(/Personales|Osobowe/i)).toBeInTheDocument();
  });

  it("submits the booking to POST /api/reservations and shows confirmation", async () => {
    renderWithLanguage();

    fireEvent.click(screen.getByText("19:00"));
    fireEvent.click(screen.getByRole("button", { name: /Continuar|Przejdź/i }));

    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], { target: { value: "Juan Pérez" } });
    fireEvent.change(textboxes[1], { target: { value: "juan@example.com" } });
    fireEvent.change(textboxes[2], { target: { value: "123456789" } });

    const submitBtn = screen.getByRole("button", { name: /Finalizar|Zatwierdź/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reservations",
        expect.objectContaining({ method: "POST" })
      );
    });

    // Server-provided booking reference is shown, never data the client invented
    await waitFor(() => {
      expect(screen.getByText(/12345/)).toBeInTheDocument();
    });
  });
});
