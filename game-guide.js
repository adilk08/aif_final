import {language,translate} from './interface-language.js';
const chapters = {
  campaign: [
    ['Из поезда в город', 'Откройте карту районов в поезде и отправляйтесь в Медный узел. Ищите фрагменты адреса станции Ноль. Первая зацепка — сигнал механика Ильи.'],
    ['Дойти до сигнала', 'Выберите значок пассажира на карте и нажмите DFS для бесплатного первого маршрута. Герой сам пройдёт по коридору. Подойдя к сигналу, нажмите E для разговора.'],
    ['Вернуться с находкой', 'Закрепите путь якорем, распределите питание и доставьте механика в поезд. Проверьте мастерскую перед следующей вылазкой. В журнале сохраняются свидетельства об АРИАДНЕ.']
  ],
  classic: [
    ['Найти Хранителя', 'На карте спрятаны пять противников. Победите всех пятерых, выберите подготовку к финалу и отправляйтесь к появившемуся Хранителю.'],
    ['Построить маршрут', 'Нажмите M, выберите врага, тайник или событие. DFS бесплатен, BFS ищет путь с наименьшим числом шагов. UCS и A* учитывают стоимость клеток. Туман открывается на ходу. Первый проход расходует HP до порога в 10, повторный проход бесплатен.'],
    ['Пережить бой', 'Враг показывает следующий ход. Защита смягчает удар и возвращает энергию. Сильный удар тратит энергию, лечение — зелье и ход. После победы выберите трофей.']
  ]
};
const localizedChapters={
  ru:chapters,
  kk:{
    campaign:[
      ['Пойыздан қалаға','Пойыздағы аудан картасын ашып, Мыс торабына аттаныңыз. Мақсат — Нөл станциясы мекенжайының бөліктерін жинау. Алғашқы белгі механик Ильядан келеді.'],
      ['Сигналға жету','Картадан жолаушы белгісін таңдаңыз. DFS алғашқы бағытты тегін салады, кейіпкер дәлізбен өзі жүреді. Жақындағанда сөйлесу үшін E басыңыз.'],
      ['Олжамен оралу','Жолды зәкірмен бекітіп, қуатты бөліңіз де, механикті пойызға жеткізіңіз. Келесі сапар алдында шеберханаға кіріңіз. АРИАДНА туралы айғақтар журналда сақталады.']
    ],
    classic:[
      ['Сақшыны табу','Картада бес қарсылас бар. Бесеуін де жеңіп, соңғы ұрысқа бір дайындықты таңдаңыз. Сонда Сақшының белгісі пайда болады.'],
      ['Бағыт салу','M басып, жауды, жасырын қойманы немесе оқиғаны таңдаңыз. DFS тегін, BFS ең аз қадамды жолды табады. UCS пен A* торлардың құнын ескереді. Жаңа торға алғаш кіргенде HP азаяды, бірақ жол шығыны оны 10-нан төмен түсірмейді. Қайталап өту тегін.'],
      ['Ұрыста аман қалу','Қарсыластың келесі жүрісі алдын ала көрсетіледі. Қорғаныс соққыны әлсіретіп, қуат қайтарады. Қуатты соққыға қуат, емделуге бір дәрі мен бір жүріс жұмсалады. Жеңістен кейін олжа таңдаңыз.']
    ]
  },
  en:{
    campaign:[
      ['From the train into the city','Open the district map aboard the train and head to Copper Junction. Collect fragments of the address for Station Zero. Your first lead is a signal from Ilya, the mechanic.'],
      ['Reach the signal','Select the passenger marker and choose DFS for a free first route. Your character follows the corridor automatically. Press E when you reach the passenger to talk.'],
      ['Bring your finds home','Anchor a route, allocate power and escort the mechanic to the train. Visit the workshop before your next expedition. Your journal keeps the evidence you uncover about ARIADNE.']
    ],
    classic:[
      ['Find the Keeper','Defeat all five enemies on the map, choose one upgrade for the final encounter, then head for the Keeper’s newly revealed marker.'],
      ['Plan a route','Press M and select an enemy, cache or event. DFS is free. BFS finds the fewest steps. UCS and A* account for terrain costs. Travel clears fog and costs HP the first time you enter a tile, down to a floor of 10 HP. Retracing your steps is free.'],
      ['Survive the fight','Watch the enemy’s announced move. Guard softens the next hit and restores energy. A heavy strike costs energy. Healing costs a potion and a turn. Choose a trophy after each victory.']
    ]
  }
};
localizedChapters.ru.campaign.push(['Сады без солнца','После Архива выберите Сады на карте линий. Пульт переключает свет между галереями. Проверьте передатчик, назначьте дежурного и подайте поезд к посадочной. Размах стрелы можно остановить защитой или пробитием.']);
localizedChapters.kk.campaign.push(['Күнсіз бақтар','Мұрағаттан кейін бағыт картасынан Бақтарды таңдаңыз. Пульт галереялардың жарығын ауыстырады. Таратқышты тексеріп, кезекшіні тағайындаңыз да, пойызды перронға шақырыңыз. Кранның соққысын қорғаныспен немесе сауытты тесумен тоқтатуға болады.']);
localizedChapters.en.campaign.push(['Sunless Gardens','After the Archive, select the Gardens on the line map. Switch gallery lighting at the panel, inspect the transmitter, assign a signal keeper and call the train. Guard or Pierce interrupts the loader’s boom.']);
const keyLabels={
  ru:['по разведанной местности','взаимодействие','зелье','остановка'],
  kk:['барланған жерде жүру','әрекет ету','дәрі ішу','тоқтау'],
  en:['explored ground','interact','potion','stop']
};
class GameGuide extends HTMLElement {
  connectedCallback(){
    this.mode=this.getAttribute('initial')==='classic'?'classic':'campaign';
    this.render=()=>{
      const lang=language();
      this.lang=lang;
      this.innerHTML=`<div class="guide-switch" role="group" aria-label="${translate('Раздел гайда')}">
        <button type="button" data-mode="campaign">${translate('Кампания')}</button>
        <button type="button" data-mode="classic">${translate('Классический забег')}</button>
      </div><div class="guide-page" aria-live="polite"></div>`;
      const select=mode=>{
        this.mode=mode;
        this.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
        this.querySelector('.guide-page').innerHTML=localizedChapters[lang][mode].map(([title,copy])=>
          `<section><h3>${title}</h3><p>${copy}</p></section>`
        ).join('')+'<p class="guide-keys">'+['WASD','E','Q','Space'].map((key,i)=>
          `<kbd>${key}</kbd> ${keyLabels[lang][i]}`
        ).join(' · ')+'</p>';
      };
      this.querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.mode));
      select(this.mode);
    };
    this.render();
    document.addEventListener('interface-language',this.render);
  }
  disconnectedCallback(){document.removeEventListener('interface-language',this.render)}
}
customElements.define('game-guide', GameGuide);
