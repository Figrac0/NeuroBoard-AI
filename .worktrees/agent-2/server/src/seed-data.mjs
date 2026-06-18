const electronicsItems = [
  {
    id: 'el-001',
    title: 'Наушники',
    price: 2990,
    description:
      'Компактные беспроводные наушники для города и тренировок. Держат заряд стабильно, кейс без трещин.',
    params: {
      type: 'misc',
      brand: 'Soundcore',
      model: 'Lite Air',
      condition: 'used',
      color: 'Белый',
    },
  },
  {
    id: 'el-002',
    title: 'MacBook Pro 16″',
    price: 64000,
    description:
      'Продам свой MacBook Pro 16" (2021) на чипе M1 Pro. Состояние отличное, работал бережно. Мощности хватает на всё: от сложного монтажа до кода, при этом ноутбук почти не греется.',
    params: {
      type: 'laptop',
      brand: 'Apple',
      model: 'M1 Pro',
    },
  },
  {
    id: 'el-003',
    title: 'iPad Air 11, 2024 г.',
    price: 37000,
    description:
      'Планшет в хорошем состоянии, экран без выгораний и сколов. Подойдёт для работы, обучения и поездок.',
    params: {
      type: 'misc',
      brand: 'Apple',
      model: 'iPad Air 11',
      condition: 'used',
      color: 'Синий',
    },
  },
  {
    id: 'el-004',
    title: 'MAJOR VI',
    price: 20000,
    description:
      'Накладные наушники Marshall. Плотный звук, отличный внешний вид, все кнопки и Bluetooth работают.',
    params: {
      type: 'misc',
      brand: 'Marshall',
      model: 'Major VI',
      condition: 'new',
      color: 'Чёрный',
    },
  },
  {
    id: 'el-005',
    title: 'iPhone 17 Pro Max',
    price: 107000,
    description:
      'Флагманский смартфон с большим экраном и отличной камерой. Полный комплект, без следов падений.',
    params: {
      type: 'phone',
      brand: 'Apple',
      model: 'iPhone 17 Pro Max',
      condition: 'used',
      color: 'Титан',
    },
  },
  {
    id: 'el-006',
    title: 'PlayStation 5 Digital',
    price: 42000,
    description:
      'Консоль в отличном состоянии, без шума и перегревов. Отдам с одним геймпадом и коробкой.',
    params: {
      type: 'misc',
      brand: 'Sony',
      model: 'PlayStation 5 Digital',
      condition: 'used',
      color: 'Белый',
    },
  },
  {
    id: 'el-007',
    title: 'Sony WH-1000XM5',
    price: 21900,
    description:
      'Шумоподавление работает отлично, амбушюры без сильного износа. Использовались дома и в командировках.',
    params: {
      type: 'misc',
      brand: 'Sony',
      model: 'WH-1000XM5',
      condition: 'used',
      color: 'Серый',
    },
  },
  {
    id: 'el-008',
    title: 'Nintendo Switch OLED',
    price: 26800,
    description: 'Яркий OLED-экран, джойконы без дрифта. Подходит для семейных игр и поездок.',
    params: {
      type: 'misc',
      brand: 'Nintendo',
      model: 'Switch OLED',
      condition: 'used',
      color: 'Белый',
    },
  },
  {
    id: 'el-009',
    title: 'Ноутбук ASUS Vivobook 15',
    price: 33500,
    description:
      'Лёгкий ноутбук для учёбы и работы. Батарея живая, клавиатура в хорошем состоянии.',
    params: {
      type: 'laptop',
      brand: 'ASUS',
      model: 'Vivobook 15',
      condition: 'used',
      color: 'Серебристый',
    },
  },
  {
    id: 'el-010',
    title: 'Samsung Galaxy S25',
    price: 69900,
    description:
      'Смартфон в отличном состоянии, использовался несколько месяцев. Есть чек и фирменный чехол.',
    params: {
      type: 'phone',
      brand: 'Samsung',
      model: 'Galaxy S25',
      condition: 'used',
      color: 'Графит',
    },
  },
  {
    id: 'el-011',
    title: 'Яндекс Станция Макс',
    price: 15900,
    description: 'Громкая колонка с HDMI и управлением умным домом. Подключение без проблем.',
    params: {
      type: 'misc',
      brand: 'Яндекс',
      model: 'Станция Макс',
      condition: 'used',
      color: 'Чёрный',
    },
  },
  {
    id: 'el-012',
    title: 'Apple Watch Ultra 2',
    price: 51000,
    description:
      'Часы для спорта и путешествий, стекло без трещин. Аккумулятор держит полный день уверенно.',
    params: {
      type: 'misc',
      brand: 'Apple',
      model: 'Watch Ultra 2',
      condition: 'used',
      color: 'Титан',
    },
  },
  {
    id: 'el-013',
    title: 'Kindle Paperwhite',
    price: 11800,
    description: 'Электронная книга с подсветкой. Удобна для чтения в поездках и перед сном.',
    params: {
      type: 'misc',
      brand: 'Amazon',
      model: 'Paperwhite',
      condition: 'used',
      color: 'Чёрный',
    },
  },
  {
    id: 'el-014',
    title: 'Монитор LG UltraFine 27',
    price: 28400,
    description: 'Яркий 27-дюймовый монитор для работы и развлечений. Битых пикселей нет.',
    params: {
      type: 'misc',
      brand: 'LG',
      model: 'UltraFine 27',
      condition: 'used',
      color: 'Чёрный',
    },
  },
  {
    id: 'el-015',
    title: 'GoPro Hero 13',
    price: 33200,
    description:
      'Экшн-камера для путешествий и спорта. Стабилизация работает отлично, корпус не вскрывался.',
    params: {
      type: 'misc',
      brand: 'GoPro',
      model: 'Hero 13',
      condition: 'used',
      color: 'Чёрный',
    },
  },
  {
    id: 'el-016',
    title: 'DJI Mini 4',
    price: 64900,
    description:
      'Компактный дрон для съёмки с воздуха. Летает стабильно, аккумуляторы без вздутия.',
    params: {
      type: 'misc',
      brand: 'DJI',
      model: 'Mini 4',
      condition: 'used',
      color: 'Серый',
    },
  },
  {
    id: 'el-017',
    title: 'AirPods Pro 3',
    price: 15400,
    description:
      'Оригинальные наушники, шумодав и прозрачный режим работают корректно. Заряд держат хорошо.',
    params: {
      type: 'misc',
      brand: 'Apple',
      model: 'AirPods Pro 3',
      condition: 'used',
      color: 'Белый',
    },
  },
  {
    id: 'el-018',
    title: 'Xiaomi Pad 7',
    price: 24200,
    description: 'Планшет для фильмов и учёбы. Экран яркий, корпус без сильных потёртостей.',
    params: {
      type: 'misc',
      brand: 'Xiaomi',
      model: 'Pad 7',
      condition: 'used',
      color: 'Серый',
    },
  },
  {
    id: 'el-019',
    title: 'Mac mini M3',
    price: 72500,
    description:
      'Компактный системный блок для разработки и монтажа. Работает тихо, состояние почти идеальное.',
    params: {
      type: 'misc',
      brand: 'Apple',
      model: 'Mac mini M3',
      condition: 'used',
      color: 'Серебристый',
    },
  },
  {
    id: 'el-020',
    title: 'Lenovo Legion 5',
    price: 81000,
    description: '',
    params: {
      type: 'laptop',
      brand: 'Lenovo',
      model: 'Legion 5',
      condition: 'used',
    },
  },
]

const autoItems = [
  {
    id: 'au-001',
    title: 'Volkswagen Polo',
    price: 1100000,
    description: '',
    params: {
      brand: 'Volkswagen',
      model: 'Polo',
      yearOfManufacture: 2020,
      transmission: 'automatic',
      mileage: 64000,
    },
  },
  {
    id: 'au-002',
    title: 'Omoda C5',
    price: 2900000,
    description:
      'Автомобиль в отличном состоянии, один владелец. Полное обслуживание у дилера, салон аккуратный.',
    params: {
      brand: 'Omoda',
      model: 'C5',
      yearOfManufacture: 2024,
      transmission: 'automatic',
      mileage: 18000,
      enginePower: 147,
    },
  },
  {
    id: 'au-003',
    title: 'Toyota Camry',
    price: 3900000,
    description:
      'Комфортный седан для города и трассы. Кузов в родной краске, коробка без нареканий.',
    params: {
      brand: 'Toyota',
      model: 'Camry',
      yearOfManufacture: 2024,
      transmission: 'automatic',
      mileage: 12000,
    },
  },
  {
    id: 'au-004',
    title: 'Kia K5',
    price: 2680000,
    description:
      'Свежий автомобиль с хорошей комплектацией. Своевременное обслуживание, вложений не требует.',
    params: {
      brand: 'Kia',
      model: 'K5',
      yearOfManufacture: 2023,
      transmission: 'automatic',
      mileage: 31000,
      enginePower: 150,
    },
  },
  {
    id: 'au-005',
    title: 'BMW 320d',
    price: 2480000,
    description:
      'Динамичный седан с экономичным дизелем. Подвеска без посторонних шумов, салон ухожен.',
    params: {
      brand: 'BMW',
      model: '320d',
      yearOfManufacture: 2019,
      transmission: 'automatic',
      mileage: 92000,
      enginePower: 190,
    },
  },
  {
    id: 'au-006',
    title: 'Lada Vesta SW Cross',
    price: 1380000,
    description:
      'Универсал для семьи и поездок на дачу. Высокий клиренс, все расходники менялись вовремя.',
    params: {
      brand: 'Lada',
      model: 'Vesta SW Cross',
      yearOfManufacture: 2022,
      transmission: 'manual',
      mileage: 47000,
      enginePower: 113,
    },
  },
  {
    id: 'au-007',
    title: 'Hyundai Creta',
    price: 1990000,
    description:
      'Популярный кроссовер в хорошем состоянии. Кузов без серьёзных дефектов, ходовая обслужена.',
    params: {
      brand: 'Hyundai',
      model: 'Creta',
      yearOfManufacture: 2022,
      transmission: 'automatic',
      mileage: 53000,
      enginePower: 149,
    },
  },
  {
    id: 'au-008',
    title: 'Skoda Octavia',
    price: 1780000,
    description: 'Просторный лифтбек, удобный для семьи. Турбина и коробка работают ровно.',
    params: {
      brand: 'Skoda',
      model: 'Octavia',
      yearOfManufacture: 2021,
      transmission: 'automatic',
      mileage: 68000,
      enginePower: 150,
    },
  },
  {
    id: 'au-009',
    title: 'Mazda CX-5',
    price: 3120000,
    description:
      'Надёжный кроссовер, салон ухожен, все ТО по регламенту. Отлично подойдёт для города и трассы.',
    params: {
      brand: 'Mazda',
      model: 'CX-5',
      yearOfManufacture: 2023,
      transmission: 'automatic',
      mileage: 22000,
      enginePower: 194,
    },
  },
  {
    id: 'au-010',
    title: 'Chery Tiggo 7 Pro',
    price: 2140000,
    description: 'Свежий автомобиль с просторным салоном и хорошим оснащением. Без ДТП.',
    params: {
      brand: 'Chery',
      model: 'Tiggo 7 Pro',
      yearOfManufacture: 2023,
      transmission: 'automatic',
      mileage: 26000,
      enginePower: 147,
    },
  },
  {
    id: 'au-011',
    title: 'Renault Duster',
    price: 1490000,
    description:
      'Практичный автомобиль для города и загородных поездок. Мотор и полный привод работают штатно.',
    params: {
      brand: 'Renault',
      model: 'Duster',
      yearOfManufacture: 2021,
      transmission: 'manual',
      mileage: 76000,
      enginePower: 143,
    },
  },
  {
    id: 'au-012',
    title: 'Mercedes-Benz E200',
    price: 3360000,
    description:
      'Комфортный бизнес-седан. Автомобиль обслужен, салон чистый, кузов выглядит достойно.',
    params: {
      brand: 'Mercedes-Benz',
      model: 'E200',
      yearOfManufacture: 2020,
      transmission: 'automatic',
      mileage: 83000,
      enginePower: 197,
    },
  },
  {
    id: 'au-013',
    title: 'Audi Q5',
    price: 3580000,
    description:
      'Кроссовер с полным приводом и отличной динамикой. В салоне не курили, все функции работают.',
    params: {
      brand: 'Audi',
      model: 'Q5',
      yearOfManufacture: 2021,
      transmission: 'automatic',
      mileage: 52000,
      enginePower: 249,
    },
  },
  {
    id: 'au-014',
    title: 'Geely Monjaro',
    price: 3240000,
    description: 'Современный кроссовер с богатой комплектацией. Состояние близкое к новому.',
    params: {
      brand: 'Geely',
      model: 'Monjaro',
      yearOfManufacture: 2024,
      transmission: 'automatic',
      mileage: 9000,
      enginePower: 238,
    },
  },
  {
    id: 'au-015',
    title: 'Lexus RX 350',
    price: 4290000,
    description:
      'Автомобиль в отличном состоянии, комфортная подвеска и просторный салон. Полный привод исправен.',
    params: {
      brand: 'Lexus',
      model: 'RX 350',
      yearOfManufacture: 2020,
      transmission: 'automatic',
      mileage: 71000,
      enginePower: 300,
    },
  },
  {
    id: 'au-016',
    title: 'Haval Jolion',
    price: 1985000,
    description: 'Кроссовер на гарантии, аккуратная эксплуатация. Удобен для города и трассы.',
    params: {
      brand: 'Haval',
      model: 'Jolion',
      yearOfManufacture: 2024,
      transmission: 'automatic',
      mileage: 16000,
      enginePower: 143,
    },
  },
  {
    id: 'au-017',
    title: 'Subaru Outback',
    price: 2840000,
    description:
      'Полноприводный универсал для дальних поездок. Технически обслужен, без проблем по мотору.',
    params: {
      brand: 'Subaru',
      model: 'Outback',
      yearOfManufacture: 2019,
      transmission: 'automatic',
      mileage: 88000,
      enginePower: 188,
    },
  },
  {
    id: 'au-018',
    title: 'Ford Focus',
    price: 990000,
    description:
      'Надёжный городской автомобиль. Отличный вариант для первого авто или каждодневных поездок.',
    params: {
      brand: 'Ford',
      model: 'Focus',
      yearOfManufacture: 2018,
      transmission: 'manual',
      mileage: 102000,
      enginePower: 125,
    },
  },
  {
    id: 'au-019',
    title: 'Peugeot 3008',
    price: 1680000,
    description:
      'Кроссовер с интересным дизайном и мягкой подвеской. Все системы работают, ошибок нет.',
    params: {
      brand: 'Peugeot',
      model: '3008',
      yearOfManufacture: 2020,
      transmission: 'automatic',
      mileage: 84000,
      enginePower: 150,
    },
  },
  {
    id: 'au-020',
    title: 'Volvo XC60',
    price: 4080000,
    description: '',
    params: {
      brand: 'Volvo',
      model: 'XC60',
      yearOfManufacture: 2021,
      transmission: 'automatic',
      mileage: 43000,
      enginePower: 249,
    },
  },
]

const realEstateItems = [
  {
    id: 're-001',
    title: 'Студия, 25м²',
    price: 1500000,
    description:
      'Светлая студия в хорошем состоянии. Подойдёт для собственного проживания или сдачи в аренду.',
    params: {
      type: 'flat',
      address: 'Самара, ул. Победы, 12',
      area: 25,
      floor: 5,
    },
  },
  {
    id: 're-002',
    title: '1-кк, 44м²',
    price: 1900000,
    description: '',
    params: {
      type: 'flat',
      address: 'Самара, Московское шоссе, 88',
      area: 44,
    },
  },
]

function withDates(items, startDate, category) {
  return items.map((item, index) => {
    const createdAt =
      item.createdAt ?? new Date(new Date(startDate).getTime() - index * 86_400_000).toISOString()
    const updatedAt = item.updatedAt ?? createdAt

    return {
      ...item,
      category,
      createdAt,
      updatedAt,
      images: [],
    }
  })
}

export function createSeedItems() {
  const orderedItems = [
    ...withDates(electronicsItems.slice(0, 1), '2026-03-31T09:00:00.000Z', 'electronics'),
    ...withDates(autoItems.slice(0, 1), '2026-03-30T09:00:00.000Z', 'auto'),
    ...withDates(realEstateItems.slice(0, 1), '2026-03-29T09:00:00.000Z', 'real_estate'),
    ...withDates(realEstateItems.slice(1, 2), '2026-03-28T09:00:00.000Z', 'real_estate'),
    ...withDates(electronicsItems.slice(1, 2), '2026-03-27T09:00:00.000Z', 'electronics'),
    ...withDates(autoItems.slice(1, 2), '2026-03-26T09:00:00.000Z', 'auto'),
    ...withDates(electronicsItems.slice(2, 3), '2026-03-25T09:00:00.000Z', 'electronics'),
    ...withDates(electronicsItems.slice(3, 4), '2026-03-24T09:00:00.000Z', 'electronics'),
    ...withDates(autoItems.slice(2, 3), '2026-03-23T09:00:00.000Z', 'auto'),
    ...withDates(electronicsItems.slice(4, 5), '2026-03-22T09:00:00.000Z', 'electronics'),
    ...withDates(electronicsItems.slice(5), '2026-03-21T09:00:00.000Z', 'electronics'),
    ...withDates(autoItems.slice(3), '2026-03-06T09:00:00.000Z', 'auto'),
  ]

  return orderedItems
}
