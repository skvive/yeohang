package site.lexid.yeohangnav

/**
 * Strict, deterministic device-side intent parser. No cloud or navigation SDK dependency.
 * Natural language outside this allowlist is handled only by explicit user-initiated AI requests.
 */
internal object NavVoiceCommandEngine {
    enum class Action {
        OPEN_MENU, CLOSE_MENU, OPEN_LODGING, OPEN_PLACES, SEARCH_DESTINATION,
        MUTE_GUIDANCE, UNMUTE_GUIDANCE, STOP_GUIDANCE, HELP, ASK_AI
    }
    data class Command(val action: Action, val summary: String, val query: String = "")

    fun interpret(raw: String): Command {
        val text = raw.trim().replace(Regex("\\s+"), " ").take(320)
        val s = text.lowercase()
        if (s.isBlank()) return Command(Action.HELP, "명령어를 입력하거나 마이크를 누르세요.")
        if (s.contains("안내 종료") || s.contains("길안내 종료") || s.contains("내비 종료"))
            return Command(Action.STOP_GUIDANCE, "길안내 종료를 확인합니다.")
        if ((s.contains("메뉴") || s.contains("사이드바")) && (s.contains("닫") || s.contains("숨")))
            return Command(Action.CLOSE_MENU, "메뉴를 닫습니다.")
        if ((s.contains("메뉴") || s.contains("사이드바")) && (s.contains("열") || s.contains("보여")))
            return Command(Action.OPEN_MENU, "메뉴를 엽니다.")
        if ((s.contains("음성") || s.contains("소리")) && (s.contains("끄") || s.contains("꺼") || s.contains("무음")))
            return Command(Action.MUTE_GUIDANCE, "길안내 음성을 끕니다.")
        if ((s.contains("음성") || s.contains("소리")) && (s.contains("켜") || s.contains("틀") || s.contains("들려")))
            return Command(Action.UNMUTE_GUIDANCE, "길안내 음성을 켭니다.")
        if (s.contains("주변 숙소") || s.contains("숙박") || s.contains("호텔") || s.contains("펜션"))
            return Command(Action.OPEN_LODGING, "주변 숙소를 찾는 화면을 엽니다.")
        if (s.contains("관광지") || s.contains("맛집") || s.contains("여행지") || s.contains("명소"))
            return Command(Action.OPEN_PLACES, "관광지와 맛집 화면을 엽니다.")
        if (s.contains("목적지") || s.contains("길 찾아") || s.contains("길찾기") || s.contains("경로 검색") ||
            s.endsWith("로 가자") || s.endsWith("까지 가자") || s.contains("으로 안내"))
            return Command(Action.SEARCH_DESTINATION, "목적지 선택 화면으로 이동합니다. 검색 결과에서 위치를 확인하세요.", text)
        if (s.contains("도움말") || s.contains("명령어 알려"))
            return Command(Action.HELP, "메뉴 열어, 주변 숙소, 목적지 검색, 음성 꺼, 음성 켜, 길안내 종료라고 말해 보세요.")
        return Command(Action.ASK_AI, "일반 질문입니다. 'AI에게 보내기'를 눌러야 서버로 전송합니다.", text)
    }
}
