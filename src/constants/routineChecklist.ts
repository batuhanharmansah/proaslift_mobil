/**
 * Rutin bakım raporu checklist konfigürasyonu - Web ile uyumlu
 */

export interface ChecklistItem {
  id: string;
  title: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

export const ROUTINE_CHECKLIST: ChecklistSection[] = [
  {
    id: 'machine_room',
    title: 'Makine Dairesi Kontrolü',
    icon: '⚙️',
    items: [
      { id: 'carrying_ropes', title: 'Taşıyıcı halatların boy ve tel erimesi kontrolü' },
      { id: 'regulator_ropes', title: 'Regülatör halatları boy ve tel erimesi kontrolü' },
      { id: 'machine_switch_level', title: 'Makina şalter ve seviye kontrolü' },
      { id: 'machine_brake_pad', title: 'Makina fren balata kontrolü' },
      { id: 'machine_bearing_bushing', title: 'Makina yatak ve rulman kontrolü' },
      { id: 'motor_coupling_adjustment', title: 'Motor kaplin, şase, saplama ve kasnak ayarının kontrolü' },
      { id: 'machine_drive_oil_levels', title: 'Makina tahrik grubu yağ seviyeleri' },
      { id: 'machine_brake_coil', title: 'Makina fren bobini kontrolü' },
      { id: 'machine_panel_fuse_contactor', title: 'Makina panosu sigorta ve kontaktör kontrolü' },
      { id: 'control_panel_fuse_contactor', title: 'Kumanda panosu sigorta ve kontaktör kontrolü' },
      { id: 'electrical_panel_30ma', title: 'Elektrik panosu 30mA kaçak akım rölesi kontrolü' },
      { id: 'machine_room_grounding', title: 'Makina dairesi topraklama ölçümü' },
      { id: 'machine_room_cleaning', title: 'Makina dairesi temizliği' },
    ],
  },
  {
    id: 'floors',
    title: 'Katlar',
    icon: '🏢',
    items: [
      { id: 'floor_door_lock_safety', title: 'Kat kapı kilidi emniyet devreleri (130-140) kontrolü' },
      { id: 'door_automatic_device', title: 'Kapı otomatik cihazı görsel kontrol' },
      { id: 'door_spring_pulley', title: 'Kapı yaylı makara kontrolü' },
      { id: 'door_shock_absorber', title: 'Kapı amortisör ayarlaması kontrolü' },
      { id: 'door_spring_rope_wheel', title: 'Kapı yaylı-halat-tekeri kontrolü' },
      { id: 'door_locks_cleaning', title: 'Kapı kilitleri temizliği' },
      { id: 'door_hinges', title: 'Kapı menteşeleri kontrolü' },
    ],
  },
  {
    id: 'cabin_interior_top',
    title: 'Kabini İç ve Kabin Üstü Kontrolü',
    icon: '🚪',
    items: [
      { id: 'safety_circuits_120', title: 'Emniyet devreleri (120) kontrol' },
      { id: 'cabin_door_lock_safety_140', title: 'Kabin kapı kilidi emniyet devreleri (140) kontrol' },
      { id: 'floor_selector_clamp', title: 'Kat seçici klemens, somun, kopyala kontrol' },
      { id: 'regulator_rope_connection', title: 'Regülatör halat bağlantısı kontrol' },
      { id: 'revision_movement', title: 'Revizyon hareket kontrolü' },
      { id: 'level_switch', title: 'Seviye şalteri kontrol' },
      { id: 'limit_switch_817_818', title: '817-818 sınır kesici kontrol' },
      { id: 'emergency_lighting_alarm', title: 'Acil aydınlatma, alarm, diafon kontrol' },
      { id: 'floor_selector_cabin_cancel', title: 'Kat seçici kabini iptal acil stop butonu kontrol (120)' },
      { id: 'level_alignments', title: 'Seviye hizaları kontrol' },
      { id: 'tables_warning_signs', title: 'Tablolar ve uyarı levhaları kontrol' },
      { id: 'floor_buttons', title: 'Kat butonları kontrol' },
      { id: 'elevator_interior_lighting', title: 'Asansör içi aydınlatma kontrol' },
      { id: 'cabin_top_mechanical_brake', title: 'Kabin üstü mekanik fren çakılar kontrol' },
      { id: 'overload_control', title: 'Aşırı yük kontrol' },
    ],
  },
  {
    id: 'shaft_interior',
    title: 'Kuyu İçi',
    icon: '🕳️',
    items: [
      { id: 'counterweight_rope_chassis', title: 'Karşı ağırlık halat şasesi, somun, kopyala kontrol' },
      { id: 'counterweight_guide_bolt', title: 'Karşı ağırlık paten ve civata kontrol' },
      { id: 'main_rail_weight_rail_oiling', title: 'Anaray ve ağırlık rayı yağlanması kontrol' },
      { id: 'shaft_bottom_regulator_pulley', title: 'Kuyu dibi regülatör kasnağı kontrol' },
      { id: 'shaft_bottom_regulator_cleaning', title: 'Kuyu dibi regülatör kasnağı temizliği' },
      { id: 'shaft_bottom_buffer', title: 'Kuyu dibi tampon kontrol' },
      { id: 'shaft_bottom_safety_circuits', title: 'Kuyu dibi emniyet devreleri (120) kontrol' },
      { id: 'shaft_bottom_cleaning', title: 'Kuyu dibi temizliği' },
    ],
  },
];
