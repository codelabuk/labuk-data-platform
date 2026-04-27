package org.codelabuk.producer.models

import zio.json.{DeriveJsonEncoder, JsonEncoder}

case class RawEvent(
                   event_id: Long,
                   `type`: String,
                   user_id: String,
                   data: String,
                   timestamp: Long
                   )

object RawEvent {
  implicit val encoder: JsonEncoder[RawEvent] = DeriveJsonEncoder.gen[RawEvent]
}