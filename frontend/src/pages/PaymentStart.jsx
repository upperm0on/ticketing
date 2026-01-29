import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { verifyPayment } from "../services/api.js";
import { addTicket } from "../store/ticketStore.js";

export default function PaymentStart() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }
    setStatus("verifying");
    verifyPayment(reference)
      .then((response) => {
        const tickets = response.tickets || [];
        if (tickets.length > 0) {
          addTicket(tickets[0]);
          navigate(`/ticket/success/${tickets[0].id}`);
        } else {
          setStatus("error");
          setMessage("Payment verified but ticket missing.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Payment verification failed.");
      });
  }, [navigate]);

  return (
    <section className="page">
      <header className="page-header">
        <h2>Payment Verification</h2>
        <p>
          {status === "verifying" && "Verifying payment..."}
          {status === "idle" && "Waiting for payment reference."}
          {status === "error" && message}
        </p>
      </header>
      <Link className="event-button" to="/">
        Back to Events
      </Link>
    </section>
  );
}
