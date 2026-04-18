import { useState } from "react";
import { MapPin, Navigation, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => void;
  sending: boolean;
}

export default function LocationModal({
  open,
  onClose,
  onSend,
  sending,
}: LocationModalProps) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
        setLocating(false);
      },
      (err) => {
        toast.error("Erro ao obter localização: " + err.message);
        setLocating(false);
      }
    );
  };

  const handleSend = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Latitude e longitude inválidas");
      return;
    }
    onSend({
      latitude,
      longitude,
      name: name || undefined,
      address: address || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar localização</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGeolocate}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            Usar minha localização
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              type="number"
              step="any"
              className="rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              type="number"
              step="any"
              className="rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do local (opcional)"
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço (opcional)"
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          {lat && lng && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg p-2">
              <MapPin className="h-4 w-4" />
              {lat}, {lng}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={!lat || !lng || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
