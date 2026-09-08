// Public project snapshot from the club website, September 5, 2026.
// Only used when OEC_PUBLIC_PREVIEW=1 and no Supabase URL is configured.
const rows = [
  ['ender-3-klipper-upgrade','Ender 3 Repair & Klipper Upgrade','Upgrade the MCU/control board and extruder, install Klipper firmware, and tune the printer for faster and more reliable printing.','electrical'],
  ['large-format-build-plate-carriage','Large-Format Printer: Build Plate Carriage Repair','Identify a replacement design or measure and design a new carriage, fabricate and install it, and recalibrate the printer.','mechanical'],
  ['pet-bottle-filament-recycling','PET Bottle-to-Filament Recycling System','Build and test a system that converts PET bottles into usable 3D-printer filament. Assemble components, connect electronics, and develop a repeatable workflow.','environmental'],
  ['large-format-control-system','Large-Format Printer: Control System Replacement','Select and configure a compatible controller, connect motors, heaters, thermistors, and end stops, install firmware, and test the rebuilt system.','electrical'],
  ['large-format-performance-upgrades','Large-Format Printer Performance Upgrades','Identify and implement hardware, firmware, or mechanical upgrades that improve print quality, reliability, speed, or maintenance.','mechanical'],
  ['multi-material-printing-system','Multi-Material 3D Printing System','Assemble a multi-material unit with hardware available in the lab. Configure firmware, integrate it with a printer, and calibrate filament handling.','mechanical']
]
export const previewProjects = rows.map(([slug,title,summary,discipline],index)=>({
  id:`preview-${slug}`,slug,title,summary,disciplines:[discipline],skills:[],status:'open_for_interest',
  publication_state:'published',sort_order:index,cover_media_id:slug,recruiting:false,
  updates:[],timeline:[],problem:'',goal:'',lead_name:'',next_step:'Contact the club to express interest.',github_url:'',external_url:''
}))
export const previewMedia = Object.fromEntries(previewProjects.map(p=>[p.slug,{url:`https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/2026/projects-${p.slug}.jpg`,alt:p.title}]))
export function publicPreviewEnabled() { return process.env.OEC_PUBLIC_PREVIEW==='1'&&!process.env.NEXT_PUBLIC_SUPABASE_URL }
