import { BitStream } from "./bitstream";

type SpliceTime = {
  time_specified_flag: boolean,
  pts_time?: number
}
const parseSpliceTime = (stream: BitStream): SpliceTime => {
  const time_specified_flag = stream.readBool()

  if (!time_specified_flag) {
    stream.skipBits(7);
    return { time_specified_flag }
  } else {
    stream.skipBits(6)
    const pts_time = stream.readBits(33);
    return {
      time_specified_flag,
      pts_time
    }
  }
}

type BreakDuration = {
  auto_return: boolean,
  duration: number
}
const parseBreakDuration = (stream: BitStream): BreakDuration => {
  const auto_return = stream.readBool();
  stream.skipBits(6);
  const duration = stream.readBits(33);
  return {
    auto_return,
    duration
  };
}

type SpliceInsertComponent = {
  component_tag: number,
  splice_time?: SpliceTime
}
const parseSpliceInsertComponent = (splice_immediate_flag: boolean, stream: BitStream): SpliceInsertComponent => {
  const component_tag = stream.readBits(8);
  if (splice_immediate_flag) {
    return { component_tag };
  }

  const splice_time = parseSpliceTime(stream);
  return {
    component_tag,
    splice_time
  };
}
type SpliceScheduleEventComponent = {
  component_tag: number,
  utc_splice_time: number
}
const parseSpliceScheduleEventComponent = (stream: BitStream): SpliceScheduleEventComponent => {
  const component_tag = stream.readBits(8);
  const utc_splice_time = stream.readBits(32);
  return {
    component_tag,
    utc_splice_time
  };
}

type SpliceScheduleEvent = {
  splice_event_id: number,
  splice_event_cancel_indicator: boolean,
  out_of_network_indicator?: boolean,
  program_splice_flag?: boolean,
  duration_flag?: boolean,
  utc_splice_time?: number,
  component_count?: number,
  components?: SpliceScheduleEventComponent[]
  break_duration?: BreakDuration,
  unique_program_id?: number
  avail_num?: number,
  avails_expected?: number
}
const parseSpliceScheduleEvent = (stream: BitStream): SpliceScheduleEvent => {
  const splice_event_id = stream.readBits(32);
  const splice_event_cancel_indicator = stream.readBool();
  stream.skipBits(7);

  const spliceScheduleEvent: SpliceScheduleEvent = {
    splice_event_id,
    splice_event_cancel_indicator
  }

  if (splice_event_cancel_indicator) {
    return spliceScheduleEvent;
  }

  spliceScheduleEvent.out_of_network_indicator = stream.readBool()
  spliceScheduleEvent.program_splice_flag = stream.readBool()
  spliceScheduleEvent.duration_flag = stream.readBool()
  stream.skipBits(5)

  if (spliceScheduleEvent.program_splice_flag) {
    spliceScheduleEvent.utc_splice_time = stream.readBits(32);
  } else {
    spliceScheduleEvent.component_count = stream.readBits(8);
    spliceScheduleEvent.components = [];
    for (let i = 0; i < spliceScheduleEvent.component_count; i++) {
      spliceScheduleEvent.components.push(parseSpliceScheduleEventComponent(stream));
    }
  }

  if (spliceScheduleEvent.duration_flag) {
    spliceScheduleEvent.break_duration = parseBreakDuration(stream);
  }

  spliceScheduleEvent.unique_program_id = stream.readBits(16);
  spliceScheduleEvent.avail_num = stream.readBits(8);
  spliceScheduleEvent.avails_expected = stream.readBits(8);

  return spliceScheduleEvent;
}

type SpliceNull = {}
type SpliceSchedule = {
  splice_count: number,
  events: SpliceScheduleEvent[],
}
type SpliceInsert = {
  splice_event_id: number,
  splice_event_cancel_indicator: boolean,
  out_of_network_indicator?: boolean,
  program_splice_flag?: boolean,
  duration_flag?: boolean,
  splice_immediate_flag?: boolean,
  splice_time?: SpliceTime,
  component_count?: number,
  components?: SpliceInsertComponent[],
  break_duration?: BreakDuration,
  unique_program_id?: number,
  avail_num?: number,
  avails_expected?: number
}
type TimeSignal = {
  splice_time: SpliceTime
}
type BandwidthReservation = {}
type PrivateCommand = {
  identifier: string,
  private_data: ArrayBuffer
}

type SpliceCommand = SpliceNull | SpliceSchedule | SpliceInsert | TimeSignal | BandwidthReservation | PrivateCommand

const parseSpliceNull = (): SpliceNull => {
  return {};
};
const parseSpliceSchedule = (stream: BitStream): SpliceSchedule => {
  const splice_count = stream.readBits(8)
  const events: SpliceScheduleEvent[] = [];
  for (let i = 0; i < splice_count; i++) {
    events.push(parseSpliceScheduleEvent(stream));
  }
  return {
    splice_count,
    events
  };
}
const parseSpliceInsert = (stream: BitStream): SpliceInsert => {
  const splice_event_id = stream.readBits(32);
  const splice_event_cancel_indicator = stream.readBool();
  stream.skipBits(7);

  const spliceInsert: SpliceInsert = {
    splice_event_id,
    splice_event_cancel_indicator
  }

  if (splice_event_cancel_indicator) {
    return spliceInsert;
  }

  spliceInsert.out_of_network_indicator = stream.readBool()
  spliceInsert.program_splice_flag = stream.readBool()
  spliceInsert.duration_flag = stream.readBool()
  spliceInsert.splice_immediate_flag = stream.readBool()
  stream.skipBits(4)

  if (spliceInsert.program_splice_flag && !spliceInsert.splice_immediate_flag) {
    spliceInsert.splice_time = parseSpliceTime(stream);
  }
  if (!spliceInsert.program_splice_flag) {
    spliceInsert.component_count = stream.readBits(8)
    spliceInsert.components = [];
    for (let i = 0; i < spliceInsert.component_count; i++) {
      spliceInsert.components.push(parseSpliceInsertComponent(spliceInsert.splice_immediate_flag, stream));
    }
  }

  if (spliceInsert.duration_flag) {
    spliceInsert.break_duration = parseBreakDuration(stream);
  }

  spliceInsert.unique_program_id = stream.readBits(16);
  spliceInsert.avail_num = stream.readBits(8);
  spliceInsert.avails_expected = stream.readBits(8);

  return spliceInsert;
}
const parseTimeSignal = (stream: BitStream): TimeSignal => {
  return {
    splice_time: parseSpliceTime(stream)
  };
}
const parseBandwidthReservation = (): BandwidthReservation => {
  return {};
}
const parsePrivateCommand = (splice_command_length: number, stream: BitStream): PrivateCommand => {
  const identifier = String.fromCharCode(stream.readBits(8), stream.readBits(8), stream.readBits(8), stream.readBits(8))
  const data = new Uint8Array(splice_command_length - 4);
  for (let i = 0; i < splice_command_length - 4; i++) {
    data[i] = stream.readBits(8);
  }

  return {
    identifier,
    private_data: data.buffer
  }
}

type Descriptor = {
  descriptor_tag: number,
  descriptor_length: number,
  identifier: string
}
type AvailDescriptor = Descriptor & {
  provider_avail_id: number
}
const parseAvailDescriptor = (descriptor_tag: number, descriptor_length: number, identifier: string, stream: BitStream): AvailDescriptor => {
  const provider_avail_id = stream.readBits(32);
  
  return {
    descriptor_tag,
    descriptor_length,
    identifier,
    provider_avail_id
  }
}
type DTMFDescriptor = Descriptor & {
  preroll: number,
  dtmf_count: number,
  DTMF_char: string
}
const parseDTMFDescriptor = (descriptor_tag: number, descriptor_length: number, identifier: string, stream: BitStream): DTMFDescriptor => {
  const preroll = stream.readBits(8);
  const dtmf_count = stream.readBits(3);
  stream.skipBits(5);
  let DTMF_char = '';
  for (let i = 0; i < dtmf_count; i++) {
    DTMF_char += String.fromCharCode(stream.readBits(8));
  }

  return {
    descriptor_tag,
    descriptor_length,
    identifier,
    preroll,
    dtmf_count,
    DTMF_char
  };
}
type SegmentationDescriptorComponent = {
  component_tag: number,
  pts_offset: number
}
const parseSegmentationDescriptorComponent = (stream: BitStream): SegmentationDescriptorComponent => {
  const component_tag = stream.readBits(8);
  stream.skipBits(7)
  const pts_offset = stream.readBits(33);
  return {
    component_tag,
    pts_offset
  };
}
type SegmentationDescriptor = Descriptor & {
  segmentation_event_id: number,
  segmentation_event_cancel_indicator: boolean,
  program_segmentation_flag?: boolean,
  segmentation_duration_flag?: boolean
  delivery_not_restricted_flag?: boolean
  web_delivery_allowed_flag?: boolean
  no_regional_blackout_flag?: boolean,
  archive_allowed_flag?: boolean,
  device_restrictions?: number
  component_count?: number,
  components?: any[]
  segmentation_duration?: number
  segmentation_upid_type?: number,
  segmentation_upid_length?: number,
  segmentation_upid?: ArrayBuffer,
  segmentation_type_id?: number,
  segment_num?: number,
  segments_expected?: number,
  sub_segment_num?: number,
  sub_segments_expected?: number
}
const parseSegmentationDescriptor = (descriptor_tag: number, descriptor_length: number, identifier: string, stream: BitStream): SegmentationDescriptor => {
  const segmentation_event_id = stream.readBits(32);
  const segmentation_event_cancel_indicator = stream.readBool();
  stream.skipBits(7);

  const segmentationDescriptor: SegmentationDescriptor = {
    descriptor_tag,
    descriptor_length,
    identifier,
    segmentation_event_id,
    segmentation_event_cancel_indicator
  }

  if (segmentation_event_cancel_indicator) {
    return segmentationDescriptor;
  }

  segmentationDescriptor.program_segmentation_flag = stream.readBool();
  segmentationDescriptor.segmentation_duration_flag = stream.readBool();
  segmentationDescriptor.delivery_not_restricted_flag = stream.readBool();

  if (!segmentationDescriptor.delivery_not_restricted_flag) {
    segmentationDescriptor.web_delivery_allowed_flag = stream.readBool();
    segmentationDescriptor.no_regional_blackout_flag = stream.readBool();
    segmentationDescriptor.archive_allowed_flag = stream.readBool();
    segmentationDescriptor.device_restrictions = stream.readBits(2);
  } else {
    stream.skipBits(5);
  }

  if (!segmentationDescriptor.program_segmentation_flag) {
    segmentationDescriptor.component_count = stream.readBits(8);
    segmentationDescriptor.components = [];
    for (let i = 0; i < segmentationDescriptor.component_count; i++) {
      segmentationDescriptor.components.push(parseSegmentationDescriptorComponent(stream));
    }
  }

  if (segmentationDescriptor.segmentation_duration_flag) {
    segmentationDescriptor.segmentation_duration = stream.readBits(40);
  }

  segmentationDescriptor.segmentation_upid_type = stream.readBits(8);
  segmentationDescriptor.segmentation_upid_length = stream.readBits(8);
  {
    const upid = new Uint8Array(segmentationDescriptor.segmentation_upid_length)
    for (let i = 0; i < segmentationDescriptor.segmentation_upid_length; i++) {
      upid[i] = stream.readBits(8);
    }
    segmentationDescriptor.segmentation_upid = upid.buffer;
  }
  segmentationDescriptor.segmentation_type_id = stream.readBits(8);
  segmentationDescriptor.segment_num = stream.readBits(8);
  segmentationDescriptor.segments_expected = stream.readBits(8);
  if (
    segmentationDescriptor.segmentation_type_id === 0x34 ||
    segmentationDescriptor.segmentation_type_id === 0x36 ||
    segmentationDescriptor.segmentation_type_id === 0x38 ||
    segmentationDescriptor.segmentation_type_id === 0x3A
  ) {
    segmentationDescriptor.sub_segment_num = stream.readBits(8);
    segmentationDescriptor.sub_segments_expected = stream.readBits(8);
  }

  return segmentationDescriptor;
}
type TimeDescriptor = Descriptor & {
  TAI_seconds: number,
  TAI_ns: number,
  UTC_offset: number
}
const parseTimeDescriptor = (descriptor_tag: number, descriptor_length: number, identifier: string, stream: BitStream): TimeDescriptor => {
  const TAI_seconds = stream.readBits(48);
  const TAI_ns = stream.readBits(32);
  const UTC_offset = stream.readBits(16);

  return {
    descriptor_tag,
    descriptor_length,
    identifier,
    TAI_seconds,
    TAI_ns,
    UTC_offset
  };
}
type AudioDescriptorComponent = {
  component_tag: number,
  ISO_code: string
  Bit_Stream_Mode: number
  Num_Channels: number,
  Full_Srvc_Audio: boolean
}
const parseAudioDescriptorComponent = (stream: BitStream): AudioDescriptorComponent => {
  const component_tag = stream.readBits(8)
  const ISO_code = String.fromCharCode(stream.readBits(8), stream.readBits(8), stream.readBits(8));
  const Bit_Stream_Mode = stream.readBits(3);
  const Num_Channels = stream.readBits(4);
  const Full_Srvc_Audio = stream.readBool();

  return {
    component_tag,
    ISO_code,
    Bit_Stream_Mode,
    Num_Channels,
    Full_Srvc_Audio
  };
}
type AudioDescriptor = Descriptor & {
  audio_count: number,
  components: AudioDescriptorComponent[]
}
const parseAudioDescriptor = (descriptor_tag: number, descriptor_length: number, identifier: string, stream: BitStream): AudioDescriptor => {
  const audio_count = stream.readBits(4);
  const components: AudioDescriptorComponent[] = [];
  for (let i = 0; i < audio_count; i++) {
    components.push(parseAudioDescriptorComponent(stream));
  }
  
  return {
    descriptor_tag,
    descriptor_length,
    identifier,
    audio_count,
    components
  };
}

type SpliceDescriptor = AvailDescriptor | DTMFDescriptor | SegmentationDescriptor | TimeDescriptor | AudioDescriptor;

export default (binary: ArrayBuffer) => {
  const stream = new BitStream(binary);

  const table_id = stream.readBits(8);
  const section_syntax_indicator = stream.readBool();
  const private_indicator = stream.readBool();
  stream.skipBits(2);
  const section_length = stream.readBits(12);
  const protocol_version = stream.readBits(8);
  const encrypted_packet = stream.readBool();
  const encryption_algorithm = stream.readBits(6);
  const pts_adjustment = stream.readBits(33);
  const cw_index = stream.readBits(8);
  const tier = stream.readBits(12);
  const splice_command_length = stream.readBits(12)
  const splice_command_type = stream.readBits(8)

  let splice_command: SpliceCommand | null = null;
  if (splice_command_type === 0x00) {
    splice_command = parseSpliceNull();
  } else if(splice_command_type === 0x04) {
    splice_command = parseSpliceSchedule(stream);
  } else if(splice_command_type === 0x05) {
    splice_command = parseSpliceInsert(stream);
  } else if(splice_command_type === 0x06) {
    splice_command = parseTimeSignal(stream);
  } else if(splice_command_type === 0x07) {
    splice_command = parseBandwidthReservation();
  } else if(splice_command_type === 0xFF) {
    splice_command = parsePrivateCommand(splice_command_length, stream)
  } else {
    stream.skipBits(splice_command_length * 8);
  }

  const splice_descriptors: SpliceDescriptor[] = [];

  const descriptor_loop_length = stream.readBits(16)
  for (let length = 0; length < descriptor_loop_length; ) {
    const descriptor_tag = stream.readBits(8);
    const descriptor_length = stream.readBits(8);
    const identifier = String.fromCharCode(stream.readBits(8), stream.readBits(8), stream.readBits(8), stream.readBits(8));

    if (descriptor_tag === 0x00) {
      splice_descriptors.push(parseAvailDescriptor(descriptor_tag, descriptor_length, identifier, stream));
    } else if (descriptor_tag === 0x01) {
      splice_descriptors.push(parseDTMFDescriptor(descriptor_tag, descriptor_length, identifier, stream));
    } else if (descriptor_tag === 0x02) {
      splice_descriptors.push(parseSegmentationDescriptor(descriptor_tag, descriptor_length, identifier, stream));
    } else if (descriptor_tag === 0x03) {
      splice_descriptors.push(parseTimeDescriptor(descriptor_tag, descriptor_length, identifier, stream));
    } else if (descriptor_tag === 0x04) {
      splice_descriptors.push(parseAudioDescriptor(descriptor_tag, descriptor_length, identifier, stream));
    } else {
      stream.skipBits((descriptor_length - 4) * 8);
    }

    length += 2 + descriptor_length;
  }

  if (encrypted_packet) {
    if (stream.bitLength() > 64) {
      stream.skipBits(stream.bitLength() - 64);
    }
    const E_CRC32 = stream.readBits(32);
    const CRC32 = stream.readBits(32);

    return {
      table_id,
      section_syntax_indicator,
      private_indicator,
      section_length,
      protocol_version,
      encrypted_packet,
      encryption_algorithm,
      pts_adjustment,
      cw_index,
      tier,
      splice_command_length,
      splice_command_type,
      splice_command,
      descriptor_loop_length,
      splice_descriptors,
      E_CRC32,
      CRC32
    };
  } else {
    if (stream.bitLength() > 32) {
      stream.skipBits(stream.bitLength() - 32);
    }
    const CRC32 = stream.readBits(32);

    return {
      table_id,
      section_syntax_indicator,
      private_indicator,
      section_length,
      protocol_version,
      encrypted_packet,
      encryption_algorithm,
      pts_adjustment,
      cw_index,
      tier,
      splice_command_length,
      splice_command_type,
      splice_command,
      descriptor_loop_length,
      splice_descriptors,
      CRC32
    };
  }
}
