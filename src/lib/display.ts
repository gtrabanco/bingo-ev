export const VEHICLE_LABELS: Record<string, string> = {
  bev_tesla: 'Tesla',
  bev_renault: 'Renault',
  bev_vw: 'Volkswagen',
  bev_hyundai: 'Hyundai',
  bev_kia: 'Kia',
  bev_byd: 'BYD',
  bev_cupra: 'SEAT / Cupra',
  bev_peugeot: 'Peugeot / Citroën / Opel',
  bev_nissan: 'Nissan',
  bev_bmw: 'BMW / MINI',
  bev_audi: 'Audi',
  bev_mercedes: 'Mercedes',
  bev_volvo: 'Volvo',
  bev_other: 'Otra eléctrica',
  phev: 'Híbrido enchufable',
  ice: 'Combustión',
};

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}
