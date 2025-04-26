
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jerusalemNeighborhoods } from "@/data/jerusalemNeighborhoods";

interface NeighborhoodSelectProps {
  value?: string | null;
  onSelect: (value: string) => void;
}

export function NeighborhoodSelect({ value, onSelect }: NeighborhoodSelectProps) {
  return (
    <Select value={value || ""} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select neighborhood" />
      </SelectTrigger>
      <SelectContent>
        {jerusalemNeighborhoods.map((neighborhood) => (
          <SelectItem key={neighborhood} value={neighborhood}>
            {neighborhood}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
