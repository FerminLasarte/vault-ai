import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildSuggestionMailto } from "@/lib/feedback";
import { osName } from "@/lib/platform";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Travels with the message so a report never arrives without it.
  version: string | null;
}

// Writing happens here, in the app's own dialog rather than in whatever the
// system opens. Sending happens in the user's mail client, because this app has
// nowhere to send anything to: no server, no account, and a promise that data
// stays on the machine.
//
// The last step is deliberately spelled out on the button — "Abrir el correo",
// not "Enviar" — so nobody closes this thinking the message left.
export function SuggestionDialog({ open, onOpenChange, version }: SuggestionDialogProps) {
  const [message, setMessage] = useState("");

  async function handleSend() {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    try {
      await openUrl(
        buildSuggestionMailto(trimmed, {
          version: version ?? "desconocida",
          os: osName(),
        }),
      );

      // Cleared only once the message is on its way. Cancelling keeps the
      // draft, so reopening the dialog does not cost the user what they wrote.
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo abrir tu programa de correo");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contame tu idea</DialogTitle>
          <DialogDescription>
            Qué te falta, qué no funciona o qué te resultó confuso. Se abre tu programa de
            correo con el mensaje ya escrito para que lo mandes vos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="suggestion-message" className="sr-only">
            Tu mensaje
          </Label>
          <Textarea
            id="suggestion-message"
            autoFocus
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ej. Me gustaría ver cuánto gasté en un viaje."
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={message.trim().length === 0}
            onClick={() => void handleSend()}
          >
            Abrir el correo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
