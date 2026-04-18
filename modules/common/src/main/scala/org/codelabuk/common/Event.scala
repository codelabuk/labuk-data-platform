package org.codelabuk.common

import org.json4s.{DefaultFormats, _}
import org.json4s.jackson.JsonMethods
import java.time.Instant

case class Event(eventId: Long,
                 eventType: String,
                 eventData: String,
                 eventTimestamp: Instant)

object Event {
  implicit val formats: DefaultFormats.type = DefaultFormats

  def fromJson(json: String): Option[Event] = {
    try {
      val parsed = JsonMethods.parse(json)
      val eventId = (parsed \ "event_id").extractOpt[Long].getOrElse(0L)
      val eventType = (parsed \ "type").extractOpt[String].getOrElse("")
      val eventData = (parsed \ "data").extractOpt[String].getOrElse("")
      val timestamp = (parsed \ "timestamp").extractOpt[Long] match {
        case Some(epochSeconds) => Instant.ofEpochSecond(epochSeconds)
        case None => Instant.now()
      }
      if (eventId > 0 && eventType.nonEmpty) {
        Some(Event(eventId, eventType, eventData, timestamp))
      } else {
        None
      }
    } catch {
      case e: Exception =>
        println(s"[Event] failed to parse JSON: ${e.getMessage}")
        None
    }
  }

  def toJson(event: Event): String = {
    s"""{"event_id":${event.eventId},"type":"${event.eventType}","data":"${event.eventData}","timestamp":${event.eventTimestamp.getEpochSecond}}"""
  }
}
