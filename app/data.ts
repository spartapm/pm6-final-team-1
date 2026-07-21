export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  followers: number;
  genres: string[];
  description: string;
};

export type Review = {
  id: string;
  bookId: string;
  user: string;
  tag: string;
  avatar: string;
  rating: number;
  body: string;
  likes: number;
  comments: number;
  date: string;
  mine?: boolean;
  likedByMe?: boolean;
};

export const books: Book[] = [
  {
    id: "honmono",
    title: "혼모노",
    author: "성해나 지음",
    cover: "https://image.aladin.co.kr/product/36225/82/cover500/k062035029_1.jpg",
    rating: 4.0,
    followers: 506,
    genres: ["소설"],
    description:
      "작품마다 치밀한 취재와 정교한 구성을 바탕으로 한 개성적인 캐릭터와 강렬하고도 서늘한 서사로 평단과 독자의 주목을 고루 받으며 새로운 세대의 리얼리즘을 열어가고 있다."
  },
  {
    id: "continue",
    title: "계속 이렇게 살아도 될까?",
    author: "김다은",
    cover: "https://image.aladin.co.kr/product/36194/83/cover500/k342035327_1.jpg",
    rating: 4.7,
    followers: 1299,
    genres: ["에세이", "자기계발"],
    description:
      "지금의 나를 다정하게 바라보며 작고 현실적인 변화를 시작하도록 돕는 생활형 에세이."
  },
  {
    id: "store",
    title: "불편한 편의점",
    author: "김호연",
    cover: "https://image.aladin.co.kr/product/27234/80/cover500/k152733337_1.jpg",
    rating: 4.7,
    followers: 2401,
    genres: ["소설", "힐링"],
    description:
      "서울역 노숙인 독고가 편의점 야간 알바로 일하며 이웃들의 마음을 조금씩 데우는 따뜻한 이야기."
  },
  {
    id: "harry",
    title: "해리포터와 마법사의 돌",
    author: "J.K. 롤링",
    cover: "https://image.aladin.co.kr/product/5141/31/cover500/8983925535_1.jpg",
    rating: 4.8,
    followers: 9012,
    genres: ["판타지"],
    description:
      "호그와트 입학 편지를 받은 해리가 친구들과 함께 자신에게 숨겨진 마법 세계의 비밀을 만난다."
  },
  {
    id: "habit",
    title: "아주 작은 습관의 힘",
    author: "제임스 클리어",
    cover: "https://image.aladin.co.kr/product/18209/13/cover500/k482534718_2.jpg",
    rating: 4.6,
    followers: 3911,
    genres: ["자기계발"],
    description:
      "작은 행동을 반복 가능한 시스템으로 만드는 방법을 알려주는 습관 설계서."
  },
  {
    id: "fox",
    title: "책 먹는 여우",
    author: "프란치스카 비어만",
    cover: "https://image.aladin.co.kr/product/11/61/cover500/8934911968_1.jpg",
    rating: 4.5,
    followers: 827,
    genres: ["동화"],
    description:
      "책을 너무 좋아해 읽고 난 뒤 소금과 후추를 뿌려 먹는 여우 아저씨의 유쾌한 이야기."
  }
];

export const reviews: Review[] = [
  {
    id: "r1",
    bookId: "continue",
    user: "복숭아말랭이",
    tag: "#1842",
    avatar: "🍑",
    rating: 4,
    body:
      "솔직히 처음엔 별 기대 없이 펼쳤는데, 읽다 보니 계속 고개를 끄덕이게 되더라고요. 거창한 변화가 아니라 딱 1%만 바꿔보자는 말이 오히려 더 와닿았어요. 다만 후반부는 앞부분이랑 비슷한 말이 반복되는 느낌이라 살짝 아쉬웠어요. 그래도 부담 없이 읽을 수 있고, 책장을 덮고 나서도 오늘 하나만 바꿔볼까 싶어지는 책이에요.",
    likes: 120,
    comments: 31,
    date: "2026.06.30",
    mine: true
  },
  {
    id: "r2",
    bookId: "honmono",
    user: "동사가좋아",
    tag: "#2051",
    avatar: "🌳",
    rating: 5,
    body:
      "혼모노라는 제목을 처음 봤을 때는 그냥 흔한 자기계발서 느낌인 줄 알았다. 그런데 읽으면 읽을수록 이 제목이 이렇게 무겁게 다가올 줄 몰랐다. 진짜와 가짜 사이에서 흔들리는 인물들을 보면서 나도 모르게 내 삶을 돌아보게 됐다.",
    likes: 9,
    comments: 2,
    date: "2026.06.30"
  },
  {
    id: "r3",
    bookId: "honmono",
    user: "몽게몽게",
    tag: "#7721",
    avatar: "🌊",
    rating: 3,
    body:
      "기대를 많이 하고 읽었는데 생각보다 호불호가 갈릴 것 같은 책이다. 문장 자체는 정말 좋다. 묘사가 섬세하고 인물의 심리를 따라가는 방식이 자연스럽다.",
    likes: 50,
    comments: 31,
    date: "2026.06.30"
  },
  {
    id: "r4",
    bookId: "store",
    user: "상냥한독서광",
    tag: "#8888",
    avatar: "🦆",
    rating: 4,
    body:
      "인물들이 조금씩 서로에게 기대는 방식이 좋아요. 큰 사건보다 일상의 온기가 오래 남는 책이라 지하철에서 읽다가 괜히 마음이 말랑해졌습니다.",
    likes: 99,
    comments: 12,
    date: "2026.06.28",
    mine: true
  }
];

export const recentSearches = ["불편한 편의점", "역행자", "해리포터", "원빙", "아주 작은 습관의 힘", "날개", "인생은 실전이다", "강아지똥", "마법천자문", "책 먹는 여우"];

export const genres = ["전체", "소설", "에세이", "자기계발", "과학"];
