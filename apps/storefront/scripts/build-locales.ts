/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BUILD LOCALES PIPELINE
 * ----------------------
 * Este script es el encargado de centralizar y procesar toda la información de las noticias 
 * del proyecto para generar los archivos de localización (i18n).
 * 
 * Funciones principales:
 * 1. Escanea todos los archivos en src/data/articleContent/ y otros orígenes de datos.
 * 2. Genera los archivos JSON en public/locales/es/data.json y public/locales/en/data.json.
 * 3. Aplica traducciones manuales desde el objeto REAL_TRANSLATIONS para evitar fallbacks automáticos.
 * 4. Actúa como la "Fuente de Verdad" (SSOT) para el contenido dinámico de la aplicación.
 * 
 * Ubicación: scripts/build-locales.ts
 * Uso: npm run build:locales
 */

import fs from 'fs';
import path from 'path';
import {
  newsArticles,
  opinionArticles,
  opinionDetails,
  categoryContent,
} from '../src/data/index';

// Import full articles from category files
import { politicaArticles as fullPolitica } from '../src/data/articleContent/politica';
import { deporteArticles as fullDeporte } from '../src/data/articleContent/deporte';
import { economiaArticles as fullEconomia } from '../src/data/articleContent/economia';
import { internacionalArticles as fullInternacional } from '../src/data/articleContent/internacional';
import { justiciaArticles as fullJusticia } from '../src/data/articleContent/justicia';
import { climaArticles as fullClima } from '../src/data/articleContent/clima';
import { saludArticles as fullSalud } from '../src/data/articleContent/salud';

const allFullArticles = [
  ...fullPolitica,
  ...fullDeporte,
  ...fullEconomia,
  ...fullInternacional,
  ...fullJusticia,
  ...fullClima,
  ...fullSalud
];

const compileMergedMessages = (locale: string, dataObject: any) => {
  const sourceLocalesDir = path.join(process.cwd(), 'src', 'i18n', 'locales', locale);
  const targetMessagesDir = path.join(process.cwd(), 'messages');
  
  if (!fs.existsSync(targetMessagesDir)) {
    fs.mkdirSync(targetMessagesDir, { recursive: true });
  }

  const merged: Record<string, any> = {
    data: dataObject
  };

  if (fs.existsSync(sourceLocalesDir)) {
    fs.readdirSync(sourceLocalesDir).forEach(file => {
      if (file.endsWith('.json')) {
        const ns = path.basename(file, '.json');
        try {
          const content = JSON.parse(fs.readFileSync(path.join(sourceLocalesDir, file), 'utf-8'));
          merged[ns] = content;
        } catch (e) {
          console.error(`Error parsing source message file ${file}:`, e);
        }
      }
    });
  }

  const targetPath = path.join(targetMessagesDir, `${locale}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Compiled and merged next-intl messages to ${targetPath}`);
};

const extractData = () => {
  const data = {
    articles: {} as Record<string, any>,
    categories: {} as Record<string, any>,
  };

  // Helper to add an article to the data object
  const addArticle = (article: any) => {
    if (!article || !article.id) return;

    if (data.articles[article.id]) {
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn(`[build-locales] Collision: article "${article.id}" already exists. Applying priority rules.`);
      }
    }
    
    // Si ya existe y tiene content, no sobreescribimos con una versión que no tenga content
    if (data.articles[article.id]?.content && !article.content) {
      return;
    }

    data.articles[article.id] = {
      ...data.articles[article.id],
      title: article.title,
      summary: article.summary,
      category: article.category,
      alt: article.alt,
      ...(article.content ? { content: article.content } : {}),
    };
  };

  // 1. Gather ALL articles from all known sources
  // Regular news
  newsArticles.forEach(addArticle);
  
  // Full articles from categories
  allFullArticles.forEach(addArticle);
  
  // Opinion articles and details
  opinionArticles.forEach(addArticle);
  Object.values(opinionDetails).forEach(addArticle);

  // 2. Scan all category content for any missed articles (sidebar, etc.)
  // Only add articles not already collected from primary sources
  Object.values(categoryContent).forEach((cat) => {
    if (cat.featuredSection.primary?.id && !data.articles[cat.featuredSection.primary.id]) {
      addArticle(cat.featuredSection.primary);
    }
    cat.featuredSection.secondary
      .filter(a => a?.id && !data.articles[a.id])
      .forEach(addArticle);
    cat.featuredSection.grid
      .filter(a => a?.id && !data.articles[a.id])
      .forEach(addArticle);
    cat.latestNews
      .filter(a => a?.id && !data.articles[a.id])
      .forEach(addArticle);
    cat.sidebarNews
      .filter(a => a?.id && !data.articles[a.id])
      .forEach(addArticle);
    cat.opinionArticles
      .filter(a => a?.id && !data.articles[a.id])
      .forEach(addArticle);

    // Extract category metadata
    data.categories[cat.slug] = {
      label: cat.label,
      description: cat.description,
      latestTitle: cat.latestTitle,
      sidebarTitle: cat.sidebarTitle,
      featuredSectionTitle: cat.featuredSection.title,
    };
  });

  // Add opinion category (used for search/article filtering, not a full editorial section)
  data.categories.opinion = {
    label: 'Opinión',
    description: 'Artículos de opinión y análisis de columnistas expertos en diversas áreas.',
    latestTitle: 'Más en Opinión',
    sidebarTitle: 'Opinion',
    featuredSectionTitle: 'Opinión',
  };

  compileMergedMessages('es', data);

  // Generate EN JSON (with real translations and fallback)
  const enData = {
    articles: {} as Record<string, any>,
    categories: {} as Record<string, any>,
  };

  const REAL_TRANSLATIONS: Record<string, any> = {
    'internacional-guerra': {
      title: 'The war in Ukraine comes to an end',
      summary: 'After years of conflict, the war in Ukraine has ended, marking a historic moment for the region and the international community.',
      alt: 'Ukrainian and international leaders signing a peace agreement document',
      content: [
        'The peace agreement was signed after intense negotiations between the involved parties, with mediation from international organizations and leaders from several countries seeking to end the violence and suffering of the civilian population.',
        'The President of Ukraine declared that the nation will begin a process of reconstruction and reconciliation, emphasizing the need for unity and cooperation to overcome the challenges arising from the conflict.',
        'For their part, Russian representatives stated that they will respect the terms of the agreement and committed to withdrawing their troops from the occupied territories, seeking stability and normalization of diplomatic relations.',
        'The international community has celebrated the end of the war, highlighting the importance of dialogue and diplomacy in conflict resolution. Humanitarian aid and reconstruction programs are expected for the affected areas.',
        'Analysts warn that, although the agreement ends hostilities, it will be crucial to implement security, justice, and economic development measures to ensure lasting peace and prevent future conflicts.',
        'Citizens of Ukraine have begun to return to their homes, while local and international organizations work to provide assistance and rebuild critical infrastructure damaged during the war.',
        'The agreement also includes provisions for international supervision and the establishment of regional cooperation mechanisms, with the aim of strengthening peace and preventing any future escalation.',
        'The world watches this historic moment with hope, trusting that the end of the war in Ukraine marks the beginning of a period of stability, development, and reconciliation across the region.'
      ]
    },
    'economia-inflacion': {
      title: 'Rising inflation impacts markets',
      summary:
        'A sustained rise in inflation is rattling financial markets and squeezing household purchasing power. Prices for essential goods and services keep climbing, forcing businesses and families to tighten budgets. Analysts warn that without effective policy measures, the trend could persist and weigh on investment, jobs, and economic stability in the medium term.',
      alt: 'Financial market screens showing rising inflation graphs and data',
      content: [
        'According to recent reports, annual inflation in major economies has exceeded analysts\' expectations, driven by rising costs for energy, food, and transport. In several European countries, prices recorded their highest increase in over a year.',
        'International stock markets reacted with volatility. The S&P 500 fell more than 1%, while the Euro Stoxx 50 and Japan\'s Nikkei recorded similar declines. Investors fear that central banks may delay interest rate cuts.',
        'Jonathan Reeves, chief economist at the International Monetary Fund, noted that the persistence of inflation "reflects structural imbalances that go beyond the economic cycle." He also warned that "if inflationary expectations do not stabilize soon, markets could face a prolonged period of uncertainty."',
        'In Latin America, the effects are also being felt. Countries with economies dependent on imports have seen how the cost of basic goods rises, directly affecting the purchasing power of families.',
        'For their part, oil and natural gas prices remain high, which adds pressure to supply chains and production costs. Manufacturing and transport companies report tighter profit margins.',
        'Analysts agree that, although inflation could moderate in the coming months, markets will remain exposed to uncertainty. Factors such as geopolitical instability, trade conflicts, and the global energy transition will continue to influence price behavior.'
      ]
    },
    'economia-bolsa': {
      title: 'Stock Market Closes Higher After Session of Investor Optimism',
      summary: 'The stock market closed higher this Thursday, driven by renewed optimism among investors and the release of positive financial results from several leading companies.',
      alt: 'Stock market board displaying S&P 500 and Nasdaq positive numbers',
      content: [
        'The S&P 500 index rose 1.2%, while the Dow Jones and Nasdaq recorded increases of 1% and 1.5% respectively. This behavior reflects investor confidence in economic stability and short-term corporate earnings prospects.',
        'Analysts point out that the combination of monetary stimulus, progress in trade agreements, and the reduction of political uncertainties has contributed to the market recovery. Additionally, the technology sector led gains, with several companies exceeding analyst expectations.',
        'For their part, foreign investors also showed interest in US markets, increasing the demand for stocks and strengthening the upward trend. This dynamic has reinforced the perception that the economy remains resilient against global challenges.',
        'In conclusion, the positive session in the stock market reflects an environment of confidence and favorable expectations. However, experts warn that volatility could return if unexpected changes occur in economic policy or key financial indicators.'
      ]
    },
    'politica-ley-ambiental': {
      title: 'Historical Approval: Congress Gives Green Light to Environmental Protection Law',
      summary: 'In a historic session, the National Congress approved by a broad majority the Environmental Protection Law, a regulation that establishes drastic measures to combat climate change and protect the country\'s ecosystems.',
      alt: 'Congress members voting on the environmental protection law',
      content: [
        'The vote had broad support from legislators, who highlighted the importance of this law to face the challenges of climate change and protect critical ecosystems for future generations.',
        'The new regulation establishes strict measures for the preservation of forests, rivers, seas, and protected areas, as well as regulations on polluting emissions and responsible waste management.',
        'Environmental experts and civil organizations celebrated the approval, noting that this law could serve as a model for other countries in the region regarding environmental protection.',
        'Among the most prominent points are incentives for companies that adopt sustainable practices, environmental education programs, and severe sanctions for those who fail to comply with the established regulations.',
        'The President of Congress stated that this law represents a fundamental step towards more responsible economic development, which does not compromise natural resources or the quality of life of future generations.',
        'Civil society and citizens in general have shown great interest in the implementation of the law, hoping that its benefits will be reflected in the improvement of air and water quality and the conservation of biodiversity.'
      ]
    },
    'politica-encuesta': {
      title: 'Polls Reveal Increase in President\'s Popularity',
      summary: 'The latest public opinion polls show a significant increase in the president\'s popularity, reflecting growing support from citizens for his policies and government management.',
      alt: 'Graph showing rising presidential approval ratings in public opinion polls',
      content: [
        'According to data collected by several polling firms, the leader\'s approval rating has risen several percentage points compared to recent months, indicating a positive perception of his performance.',
        'Political analysts attribute this increase to recent government initiatives in key areas such as economy, health, and education, as well as the effective communication of achievements in media and social networks.',
        'The increase in popularity is also observed in different population segments, including youth, professionals, and voters from urban and rural regions, showing broader and more diversified support.',
        'On the other hand, some experts highlight that this increase could be influenced by external factors, such as international stability and media coverage of certain positive events related to the administration.',
        'The president and his team have taken advantage of these polls to reinforce their communication strategy and continue promoting policies that connect with the needs and expectations of citizens.',
        'Meanwhile, opposition parties analyze these results to adjust their campaigns and proposals, seeking to counter the growing popularity of the leader in the national political landscape.'
      ]
    },
    'salud-antibioticos': {
      title: 'Growing Concern Over Antibiotic Resistance Worldwide',
      summary: 'Antibiotic resistance continues to be a growing threat to public health worldwide, generating concern among scientists and health authorities.',
      alt: 'Microscope image of antibiotic-resistant bacteria',
      content: [
        'Experts warn that the excessive and inadequate use of antibiotics has accelerated the emergence of resistant bacteria, which makes it difficult to treat common infections and increases the risk of serious complications.',
        'International organizations have urged the implementation of stricter policies to control antibiotic prescription, as well as promoting awareness campaigns about their responsible use.',
        'Recent research shows that antibiotic resistance could cause millions of additional deaths in the coming decades if effective measures are not taken immediately.',
        'Scientists highlight the importance of developing new drugs and alternative treatments, as well as strengthening epidemiological surveillance systems to detect and contain outbreaks of resistant bacteria.',
        'In conclusion, antibiotic resistance represents one of the greatest challenges of modern medicine, and requires international cooperation and a firm commitment to protect global health.'
      ]
    },
    'deporte-equipo-local': {
      title: 'Great Victory for the Local Team in an Exciting Football Match',
      summary: 'In a night full of emotion, the local team achieved an impressive victory against its main rival, consolidating its position as one of the favorites.',
      alt: 'Local football team celebrating their victory on the field',
      content: [
        'With a final score of 3-1, the team showed an excellent offensive performance and a solid defense that prevented any attempt at a comeback by the adversary. The team coach highlighted the unity and commitment of the squad as keys to success.',
        'Fans celebrated for hours in the streets, while social media was filled with messages of support and pride. Sports analysts agreed that this victory could mark a turning point in the season, strengthening team morale and fan confidence.',
        'After the match, the coach stated in a press conference: "The team showed character, discipline, and passion. Every player understood their role and fulfilled it perfectly. I am proud of what we achieved today and confident that we can keep improving."',
        'Finally, the local community has begun organizing celebrations and tributes for the players, recognizing their effort and dedication. A week full of sporting enthusiasm is expected in the city.'
      ]
    },
    'deporte-nba': {
      title: 'Lakers Defeat Celtics 112-107 in Thrilling NBA Matchup',
      summary: 'The Los Angeles Lakers defeated the Boston Celtics 112-107 in a game filled with excitement and spectacular plays that kept fans on the edge of their seats.',
      alt: 'LeBron James of the Lakers shooting against the Celtics defense',
      content: [
        'The game began with unusual intensity from the first quarter, with both teams exchanging plays and showing why they are considered two of the greatest franchises in NBA history.',
        'LeBron James was the standout figure for the Lakers, contributing 28 points, 8 rebounds, and 7 assists in a performance that proves he is still at the top of his game.',
        'Jayson Tatum led the Celtics with 25 points and 10 rebounds, but it wasn\'t enough to avoid defeat in a game that was decided in the final minutes.',
        'The third quarter was decisive, with the Lakers imposing their defensive rhythm and achieving a 32-24 run that gave them a comfortable lead for the final period.'
      ]
    },
    'deporte-espana-alemania': {
      title: 'Spain Qualifies for World Cup Final After Defeating Germany',
      summary: 'Spain secured its place in the World Cup final after defeating Germany in an intense match filled with memorable moments.',
      alt: 'Spanish soccer team celebrating qualification for the World Cup final',
      content: [
        'The first half was marked by Germany\'s offensive pressure, but the Spanish defense held firm with outstanding saves from the goalkeeper and impeccable defensive coordination.',
        'In the second half, Spain managed to impose its rhythm. The decisive goal came from a collective play that ended with a precise strike from a star player, sparking euphoria in the stands.',
        'The German team didn\'t give up and sought the equalizer until the final minutes, but the solidity of the Spanish defense and quick counterattacks allowed them to maintain the lead.',
        'The Spanish coach highlighted the discipline and teamwork of his players, stating that the victory is the result of collective effort and strategic preparation.'
      ]
    },
    'deporte-atletas': {
      title: 'Athletes Break World Records in International Championship',
      summary: 'Athletes from different countries set new world records at the international athletics championship, surpassing marks that had stood for years.',
      alt: 'Athletes breaking world records at the international championship',
      content: [
        'The Olympic Stadium witnessed historic moments when three athletes managed to overcome world records that seemed unbeatable, marking a milestone in modern athletics history.',
        'In the 100-meter dash, Jamaican sprinter Devon Allen ran in 9.58 seconds, equaling the world mark and demonstrating extraordinary speed.',
        'Polish hammer thrower Anita Włodarczyk broke her own world record with a throw of 82.98 meters, extending her dominance in the discipline.',
        'The high jump also had its glorious moment with Sweden\'s Armand Duplantis, who cleared 6.23 meters to set a new world record and leave everyone in awe.'
      ]
    },
    'justicia-fraude': {
      title: 'Former Official Detained for Massive Financial Fraud',
      summary: 'Authorities arrested a former public official this Friday accused of participating in a financial fraud scheme that allegedly diverted millions of dollars from state funds.',
      alt: 'Handcuffed former official being led by authorities',
      content: [
        'The detention occurred after an extensive investigation led by the specialized economic crimes prosecutor\'s office. According to the preliminary report, the former official allegedly used a network of shell companies to divert resources intended for social development programs.',
        'Authorities claim that the money was transferred to offshore accounts and used for the purchase of luxury properties. The detainee was moved to a preventive detention center, where he will remain in custody while charges are formalized.',
        'The prosecution has requested preventive prison, considering there is a flight risk and the possibility of obstructing the investigation. During a press conference, the Attorney General stated that this arrest represents a significant step forward in the fight against corruption.'
      ]
    },
    'clima-huracan': {
      title: 'Hurricane Strengthens in the Atlantic, Threatening the East Coast',
      summary: 'Authorities have issued evacuation alerts as a Category 3 hurricane approaches the coast with sustained winds exceeding 200 km/h.',
      alt: 'Satellite image of a hurricane approaching the coast',
      content: [
        'The hurricane, which formed several days ago in the central Atlantic, has rapidly gained strength due to high sea temperatures and favorable atmospheric conditions. Meteorologists from the National Hurricane Center reported that the system could intensify further in the coming hours.',
        'Sustained winds already exceed 200 kilometers per hour, with even stronger gusts in areas near the eye of the hurricane. The phenomenon is moving northwest at an approximate speed of 20 kilometers per hour, dangerously approaching the US East Coast.',
        'Authorities in Florida, Georgia, South Carolina, and North Carolina have issued hurricane alerts and preventive evacuation warnings in the most exposed coastal areas. Storm surges are expected to reach heights of three to five meters.'
      ]
    },
    'politica-protestas': {
      title: 'Protests Over Corruption',
      summary: 'Corruption protests have intensified in several cities across the country over the last few days, gathering thousands of citizens demanding transparency and accountability from the authorities.',
      alt: 'Crowd of protesters marching with banners in the streets',
      content: [
        'Protesters are marching through main avenues with banners and slogans, denouncing recent cases of embezzlement and requesting impartial investigations.',
        'Security forces have deployed operations to maintain order, although some isolated clashes between protesters and police have been reported.',
        'Civil organizations and civil society groups have backed the protests, highlighting the importance of citizen participation to strengthen democracy and combat corruption.',
        'The government has issued a statement ensuring that the denounced cases will be investigated and measures will be taken to guarantee transparency in public administration.',
        'Meanwhile, citizens continue to mobilize, showing their dissatisfaction and demanding concrete changes to improve trust in the country\'s institutions.'
      ]
    },
    'politica-casa-blanca': {
      title: 'White House Confirms International Summit',
      summary: 'The White House confirms an international summit for this week to address global issues, including climate change and economic security.',
      alt: 'White House building hosting the international summit',
      content: [
        'The White House has officially confirmed an international summit to be held this week, with the participation of leaders from over 50 countries to address the most urgent global challenges.',
        'The main agenda items include climate change, economic security, cooperation in public health, and geopolitical stability in conflict regions.',
        'The host president emphasized that this summit represents a unique opportunity to build consensus and establish concrete commitments that benefit all participating nations.',
        'International experts consider that this meeting could mark a turning point in multilateral diplomacy, especially after years of trade and political tensions between world powers.',
        'Non-governmental organizations and civil society have also been invited to participate in parallel sessions, ensuring a broader representation of global interests.',
        'The results of the summit will be closely monitored by financial markets and rating agencies, which expect clear signals regarding future economic and environmental policies.'
      ]
    },
    'politica-senado': {
      title: 'Senate Debates New Constitutional Reform Proposal',
      summary: 'The Senate of the Republic began debating a new constitutional reform proposal this week that seeks to introduce significant changes to the country\'s political structure.',
      alt: 'Senate chamber during the constitutional reform debate',
      content: [
        'The initiative, presented by a group of legislators from different parties, proposes adjustments in key areas such as the distribution of power, transparency in public management, and the strengthening of citizen participation mechanisms.',
        'During the plenary session, several senators expressed their positions regarding the scope of the reform. Some highlighted the importance of modernizing the Constitution to adapt it to the current demands of society, while others warned of the risk of altering fundamental articles without the necessary political consensus.',
        'The President of the Senate stated that the process will be carried out transparently and with the participation of constitutional experts, aiming to ensure a technical and pluralistic debate.',
        'Among the most discussed points are the possible reduction in the number of legislators, the implementation of new institutional control mechanisms, and the expansion of citizen rights in electoral and social justice matters.',
        'Civil organizations have expressed interest in participating in the public hearings that will accompany the analysis process, emphasizing the need for any constitutional change to respond to the interests of the population rather than partisan agendas.',
        'For its part, the Executive has indicated that it will closely follow the development of the debate without intervening directly, but ready to support initiatives that strengthen democratic governance.',
        'Political analysts agree that this reform could mark a turning point in the country\'s institutional history, depending on the level of consensus reached by the different political forces represented in Congress.',
        'The debate will continue in the coming weeks and is expected that, once concluded, the proposal will be put to a vote in the full Senate before moving to the Chamber of Deputies for final review.',
        'If approved, the constitutional reform would take effect next year, modifying several key articles of the Magna Carta and ushering in a new stage in the national political and legal framework.'
      ]
    },
    'politica-debate': {
      title: 'Presidential Debate: Candidates Confront Their Proposals Before the Country',
      summary: 'The long-awaited presidential debate took place last night, bringing together the leading candidates aspiring to hold the country\'s highest office. The event, broadcast nationwide, allowed aspirants to present and confront their proposals before millions of citizens.',
      alt: 'Presidential candidates debating on stage during the televised event',
      content: [
        'From the start, the debate was marked by an energetic tone and moments of tension, especially on economic and social issues. The candidates exchanged criticisms but also took the opportunity to present concrete solutions to the country\'s current challenges.',
        'On economic matters, the positions were diverse. While some candidates proposed reducing taxes to encourage investment and employment, others emphasized the need to strengthen social programs and increase tax collection from higher-income sectors.',
        'The issue of citizen security also generated intense exchanges. Strategies for tackling crime, drug trafficking, and corruption in institutions were discussed. Each candidate defended their vision of how to guarantee peace and trust in the security forces.',
        'Education and health were other central axes of the meeting. Some aspirants proposed a comprehensive reform of the education system, with greater investment in technology and teacher training, while others proposed improving the coverage and quality of public health services.',
        'During the environmental block, candidates debated climate change, deforestation, and the use of renewable energy. The differences were evident, although all agreed on the importance of adopting sustainable policies that protect natural resources.',
        'The debate also addressed gender issues, human rights, and government transparency. Several candidates emphasized equal opportunities, the fight against violence, and the need to modernize state institutions.',
        'Citizens followed each intervention closely through television, radio, and social networks, where the event generated millions of interactions and comments. Analysts highlight that the candidates\' performance could significantly influence upcoming polls.'
      ]
    },
    'internacional-israel-iran': {
      title: 'Tensions Rise Between Israel and Iran',
      summary: 'The Middle East region remains on high alert as diplomatic and military tensions between Israel and Iran increase, with mutual threats concerning the international community.',
      alt: 'Map of the Middle East highlighting Israel and Iran',
      content: [
        'Tensions between Israel and Iran have reached their highest point in recent years, with both countries exchanging accusations and threats that have put the entire region on alert.',
        'Diplomatic sources indicate that the conflict has intensified following alleged attacks on strategic facilities and the development of military programs that both nations consider direct threats to their national security.',
        'The international community has called for calm and dialogue, fearing an escalation that could involve other countries in the region and affect the global stability of the energy market.',
        'The United States and European powers have offered to mediate the conflict, while the United Nations has convened emergency sessions of the Security Council to address the situation.',
        'Military analysts warn that any direct confrontation would have devastating consequences for the region and could destabilize global financial markets, especially oil markets.',
        'Citizens of both countries live with increasing anxiety over the possibility of an open conflict, while governments prepare contingency plans and strengthen their defenses.',
        'Humanitarian organizations express concern over the potential impact on the civilian population and have called for diplomatic channels to be prioritized over military ones.'
      ]
    },
    'internacional-otan': {
      title: 'NATO Announces New Military Exercises in Eastern Europe',
      summary: 'The North Atlantic Treaty Organization (NATO) has confirmed the deployment of troops and the conduct of joint maneuvers on its eastern borders, in response to current geopolitical instability.',
      alt: 'NATO military troops and equipment in Eastern Europe',
      content: [
        'The Secretary-General of the alliance stated that these exercises aim to strengthen the defensive capacity of member countries and deter any possible external threat. Thousands of soldiers from different nations will participate, along with air and naval units.',
        'The drills will include tactical operations, cyber defense, and rapid deployment logistics. These maneuvers are expected to be the largest in the last decade in the region, sending a clear message of unity and readiness.',
        'Russia has criticized these moves, calling them a provocation and warning that it will take reciprocal measures to ensure its national security. Tension in the area remains high, and analysts fear that any miscalculation could trigger a major incident.',
        'Despite the aggressive rhetoric, Western leaders have reiterated that NATO is a defensive alliance and that its actions do not seek confrontation but the protection of its allies and the maintenance of peace in Europe.',
        'The international community is closely following these developments, urging all parties to keep dialogue channels open to avoid an unnecessary escalation of the conflict.'
      ]
    },
    'internacional-union-europea': {
      title: 'European Union Promotes Renewable Energy with Ambitious New Directives',
      summary: 'The European Union has approved a series of directives aimed at accelerating the transition to sustainable energy sources, with the goal of drastically reducing carbon emissions over the next decade.',
      alt: 'European Union flags with renewable energy wind turbines',
      content: [
        'The plan, known as "European Green Deal 2.0", sets mandatory targets for member states to increase the share of solar, wind, and hydroelectric power in their energy mix. The gradual phase-out of fossil fuel subsidies is also envisioned.',
        'European leaders highlighted the urgency of these measures in the face of the global climate crisis. "There is no time to lose," said the President of the European Commission, emphasizing that investment in clean energy will also generate millions of jobs and strengthen the continent\'s energy security.',
        'Environmental organizations have welcomed the initiative, although they warn that implementation will be key. They call for strict monitoring mechanisms to ensure that countries fulfill the commitments made and do not resort to false solutions like natural gas or nuclear energy.',
        'On the other hand, some industrial sectors have expressed concern about transition costs, requesting financial support and realistic timeframes to adapt their infrastructures to the new regulations.',
        'The European Union thus positions itself as a global leader in the fight against climate change, seeking to inspire other powers to adopt similar measures before the next UN climate summit.'
      ]
    },
    'internacional-china-usa': {
      title: 'New Talks Between China and the United States Mark a Turning Point in International Politics',
      summary: 'New talks between China and the United States have marked a significant shift in international politics, aiming to improve bilateral relations and address recent economic and diplomatic conflicts.',
      alt: 'Chinese and American flags representing bilateral talks',
      content: [
        'The leaders of both countries met in a high-level diplomatic encounter, where they discussed key issues such as trade, regional security, climate change, and technological cooperation.',
        'Official sources indicated that the negotiations were constructive, highlighting the willingness of both nations to find solutions that avoid tensions and promote global stability.',
        'International analysts consider that this rapprochement could have a positive impact on the world economy, by reducing uncertainties in financial markets and strengthening strategic trade agreements.',
        'It is expected that in the coming weeks, specific agreements will be announced to facilitate economic and technological exchanges, as well as cooperation mechanisms to address global challenges such as cybersecurity and environmental sustainability.',
        'Representatives of international organizations have welcomed the start of these talks, emphasizing the importance of diplomatic dialogue to maintain peace and cooperation among world powers.',
        'Citizens and businesses in both countries are watching the results of these negotiations with interest, as they could influence investments, trade, and cultural relations between China and the United States.',
        'The world remains attentive to these developments, trusting that open dialogue and strategic negotiation will lead to a more stable and collaborative international scenario.'
      ]
    },
    'internacional-accidente': {
      title: 'Tragedy on German Highway: Serious Accident Causes Chaos and Mourning',
      summary: 'A serious multi-vehicle accident on a highway near Berlin has left a tragic toll and caused a traffic jam several kilometers long, putting the focus on road safety on the famous Autobahns.',
      alt: 'German highway with multiple vehicles involved in an accident',
      content: [
        'According to police reports, the accident involved more than 15 vehicles, including two cargo trucks, and occurred under adverse weather conditions that reduced visibility on the road.',
        'Rescue teams and firefighters quickly arrived at the scene to treat the injured, some of whom were transported by helicopter to nearby hospitals due to the severity of their injuries. Authorities have confirmed several fatalities, although the exact number has not been specified.',
        'Traffic on one of the country\'s main arteries was paralyzed for hours, affecting the transport of goods and the displacement of thousands of people. Authorities have launched an exhaustive investigation to determine the exact causes of the accident.',
        'This event has revived the debate on the implementation of stricter speed limits on certain sections of the German motorways, as well as the need to improve early warning systems for drivers in emergency situations.',
        'Road safety experts urge extreme caution during the fall and winter months, when fog and ice turn roads into high-risk scenarios. New legislative proposals to strengthen transport network safety are expected to be presented in the coming days.'
      ]
    },
    'economia-dolar': {
      title: 'Dollar Hits Yearly High Against Other Currencies',
      summary: 'The US dollar has reached its highest level of the year against major world currencies, driven by global uncertainty and monetary policy expectations.',
      alt: 'US dollar bills and global currency exchange rate charts',
      content: [
        'The dollar index, which measures the performance of the US currency against a basket of six major currencies, has risen 2.3% in the last week, positioning itself at its highest level since January.',
        'Analysts attribute this strengthening to multiple factors, including persistent inflation that could lead the Federal Reserve to keep interest rates high for longer than expected.',
        'The euro has been one of the most affected currencies, falling below 1.05 dollars for the first time in several months. The British pound and the Japanese yen have also recorded significant losses against the greenback.',
        'Emerging markets are particularly feeling the impact, with several Latin American and Asian currencies reaching historic lows against the dollar, raising concerns about external debt and imported inflation.',
        'Financial experts warn that this trend could continue if US economic data continues to show resilience, while other economies face sharper slowdowns.',
        'Multinational corporations are adjusting their profit projections in the face of exchange rate volatility, while investors seek refuge in dollar-denominated assets.'
      ]
    },
    'economia-euro': {
      title: 'Euro Hits Six-Month High Against the Dollar',
      summary: 'The euro reached its highest value against the dollar in the last six months this Thursday, surpassing the 1.12 dollar barrier for the first time since April. This strengthening of the European currency reflects a change in global economic dynamics and an increase in market confidence in the stability of the eurozone.',
      alt: 'Euro coins and banknotes with dollar exchange rate graph',
      content: [
        'Analysts attribute this rebound to a combination of factors, including signals of a possible pause in interest rate hikes by the US Federal Reserve. The economic slowdown in the North American country has reduced the demand for the dollar as a safe-haven asset, which has favored the euro\'s recovery in international markets.',
        'At the same time, recent data from the European economy has shown a slight improvement in industrial activity and business confidence indices. Countries such as Germany, France, and Spain have presented stronger indicators than expected, which has boosted optimism about growth in the eurozone in the coming months.',
        'Financial sector experts highlight that the increase in the euro\'s value also responds to lower inflationary pressure in Europe. The European Central Bank (ECB) has indicated that it will maintain a prudent monetary policy, although it does not rule out adjustments if prices accelerate again. This stance has been interpreted by markets as a sign of stability and control.',
        'For its part, the US dollar has shown weakness in the face of fears of a mild recession and the possibility of the Federal Reserve cutting rates sooner than expected. The monetary policy differential between the two regions has been decisive for the euro\'s strengthening.',
        'In financial markets, the move has been well-received. Investors see the euro as an attractive opportunity against the dollar, especially in a context of global volatility. Some financial institutions predict that if current conditions hold, the European currency could reach 1.15 dollars before the end of the year.',
        'The rebound of the euro has direct implications for international trade, as it makes European exports more expensive but makes imports cheaper. This could benefit eurozone consumers, although it represents a challenge for exporting companies, which could see their competitiveness in external markets reduced.',
        'In conclusion, the strengthening of the euro against the dollar reflects a rebalancing in the global economy, where confidence in European stability and the caution of the Federal Reserve are setting the course for major currencies. The coming months will be key to determining if this upward trend consolidates or if the dollar manages to regain ground.'
      ]
    },
    'economia-petroleo': {
      title: 'Oil Prices Record Strong Rally, Worrying Consumers and Businesses',
      summary: 'Oil prices saw a sharp rally this Thursday, reaching levels not seen in recent months and causing concern among both consumers and businesses globally. This increase is attributed to a combination of factors, including geopolitical tensions in producing regions and supply restrictions by some OPEC member countries.',
      alt: 'Oil barrels and rising price chart on a financial display',
      content: [
        'Analysts indicate that the rise in crude oil could have a significant impact on transportation costs and the prices of goods and services, directly affecting family budgets. Fuels, which represent an essential expense in many economies, could see increases in the short term, increasing the pressure on citizens\' purchasing power.',
        'On the business side, transportation, logistics, and production companies are facing an increase in their operational costs. Several companies have begun to adjust prices and review supply contracts to mitigate the effects of the oil increase on their profit margins.',
        'Experts warn that if crude prices remain at high levels, additional inflationary pressures could arise globally. This could also influence central bank decisions regarding interest rates and monetary policies, creating a scenario of uncertainty in financial markets.',
        'On the international level, the rebound in oil has been mainly driven by the reduction of inventories in the United States and political tension in the Middle East. Additionally, some exporting countries have chosen to temporarily limit production to sustain prices, which has intensified market concern.',
        'In conclusion, the rise in oil represents an economic challenge for both consumers and businesses. The evolution of prices will depend on geopolitical factors, decisions of producing countries, and the markets\' ability to adapt to energy cost volatility.'
      ]
    },
    'economia-pib': {
      title: 'GDP Grows 3.5% in the Last Quarter Driven by Consumption and Investment',
      summary: 'The Gross Domestic Product (GDP) grew 3.5% in the last quarter, according to data published by the government, driven mainly by an increase in domestic consumption and private investment.',
      alt: 'GDP growth bar chart showing 3.5 percent increase',
      content: [
        'Household spending showed a positive trend, with an increase in demand for durable goods and services, reflecting consumer confidence in the economy. This growth in consumption contributed significantly to the overall progress of the GDP.',
        'For its part, business investment also experienced a notable increase. Companies have increased their spending on infrastructure, technology, and operations expansion, which has generated a multiplier effect on employment and production.',
        'Analysts highlight that the combination of solid consumption and growing investment has allowed the economy to remain on a stable growth path, despite international uncertainty and financial market volatility.',
        'In conclusion, the 3.5% increase in GDP reflects a quarter of economic dynamism, driven by both consumer confidence and the decision of companies to strengthen their productive capacity and market presence.'
      ]
    },
    'salud-contaminacion': {
      title: 'Air Pollution Increases the Risk of Respiratory Diseases',
      summary: 'Air pollution has become a growing problem affecting the health of millions of people worldwide, aggravating pre-existing conditions and creating new health problems in the general population.',
      alt: 'Industrial chimneys emitting smoke covering a city skyline',
      content: [
        'Recent studies indicate that prolonged exposure to atmospheric pollutants significantly increases the risk of developing respiratory diseases, including asthma, bronchitis, and other chronic lung conditions.',
        'Public health experts warn that fine particles and toxic gases in the air can damage the respiratory system and weaken the body\'s defenses against viral and bacterial infections.',
        'Environmental authorities have urged the implementation of stricter policies to reduce industrial emissions, promote clean transportation, and raise public awareness of the importance of reducing individual carbon footprints.',
        'Doctors recommend that people with pre-existing respiratory problems take extra precautions, such as avoiding high-pollution areas during peak hours and wearing protective masks when necessary.',
        'In conclusion, air pollution represents a serious risk to global respiratory health and requires a concerted and sustained effort from governments, businesses, and citizens to mitigate its effects and protect future generations.'
      ]
    },
    'salud-cardiovascular': {
      title: 'Medical Advances: New Therapy Promises to Improve Cardiovascular Health',
      summary: 'A new breakthrough in medicine has raised expectations in the scientific community and among patients: an innovative therapy promises to improve cardiovascular health and reduce the risks associated with heart disease.',
      alt: 'Medical professionals reviewing a patient heart scan',
      content: [
        'Initial studies show that the therapy can help strengthen the heart muscle, improve circulation, and decrease inflammation in blood vessels. Researchers highlight that this treatment could complement traditional strategies such as diet, exercise, and medication.',
        'Clinical trials are in advanced stages, and early results indicate significant improvements in the blood pressure and cardiac function of participants. Scientists assure that the safety of the treatment has been a priority throughout the research process.',
        'Cardiology specialists consider that this therapy could change the way diseases such as heart failure and hypertension are addressed, offering an alternative that works directly on the physiological factors that affect the heart.',
        'Despite the optimism, experts warn that long-term studies are still required to confirm the efficacy and safety of the treatment before it can be implemented massively in the health system. Nevertheless, the medical community looks with hope at the progress achieved so far.',
        'In conclusion, the new cardiovascular therapy represents an important step in modern medicine, offering the possibility of improving the quality of life for millions of people and marking a significant milestone in heart health research.'
      ]
    },
    'salud-corazon': {
      title: 'New Cardiovascular Therapy Promises to Improve Heart Health',
      summary: 'Medical researchers have developed an innovative cardiovascular therapy that promises to revolutionize the treatment of heart diseases and improve the quality of life for millions of patients.',
      alt: 'New cardiovascular therapy promises to improve heart health',
      content: [
        'The new therapy, developed after a decade of research, uses stem cells and genetic engineering techniques to regenerate cardiac tissue damaged by heart attacks and other cardiovascular diseases.',
        'Initial clinical trials have shown promising results, with patients experiencing significant improvements in cardiac function and a reduction in heart failure symptoms.',
        'Cardiologists highlight that this therapy could reduce the need for heart transplants and other invasive procedures, offering a less risky and more accessible alternative for patients.',
        'Health authorities are evaluating the approval of the therapy, which could be available to the general public within the next two years after completing the final phases of clinical trials.',
        'Researchers are also exploring applications of this technology for other degenerative diseases, opening new possibilities in the field of regenerative medicine.'
      ]
    },
    'salud-mental': {
      title: 'Mental Health Becomes a Priority Amid Rising Stress and Anxiety',
      summary: 'The increase in stress and anxiety among the population has turned mental health into a priority for both health authorities and society in general, driving new support and awareness strategies.',
      alt: 'Person meditating in a calm environment promoting mental well-being',
      content: [
        'Experts point out that factors such as intense work life, economic uncertainty, and rapid social changes have increased anxiety levels, affecting the quality of life and emotional well-being of millions of people.',
        'Mental health professionals recommend implementing prevention programs in schools and workplaces, promoting healthy habits such as exercise and mindfulness, and facilitating access to psychological therapies.',
        'In addition, international organizations have stressed the importance of raising public awareness about the early detection of symptoms and the elimination of the social stigma associated with seeking professional help for mental health problems.',
        'The inclusion of mental health in public health policies and emotional education is expected to contribute to creating more understanding environments and reducing the negative impact of chronic stress on society.',
        'In conclusion, mental health has established itself as a fundamental pillar of overall well-being, requiring coordinated and sustained efforts from governments, institutions, and communities to face current challenges.'
      ]
    },
    'salud-azucar': {
      title: 'Excessive Sugar Consumption Increases the Risk of Metabolic Diseases',
      summary: 'Excessive consumption of added sugars has become a critical public health problem, affecting millions of people worldwide and contributing to the rise of serious chronic diseases.',
      alt: 'Various sugary foods and drinks displayed on a table',
      content: [
        'Recent studies, validated by multiple health institutions, show that a high intake of added sugars is directly related to a higher risk of developing complex metabolic diseases, such as type 2 diabetes, severe obesity, and metabolic syndrome.',
        'Experts warn that frequent consumption of sugary drinks, sweets, and ultra-processed foods can quickly alter blood glucose levels and affect insulin function, creating a resistance that contributes to long-term health deterioration.',
        'Furthermore, early exposure to high-sugar diets during childhood can create unhealthy and addictive eating habits that persist into adulthood, exponentially increasing the likelihood of metabolic complications in later stages of life.',
        'Health authorities strongly recommend moderating sugar intake, carefully reading nutrition labels, and prioritizing natural foods such as fruits, vegetables, and whole grains, which provide essential energy and nutrients without the risks associated with refined sugars.',
        'In conclusion, reducing sugar consumption is not just a dietary choice but a key preventive measure to protect metabolic health, improve quality of life, and decrease the incidence of chronic diseases in the global population.'
      ]
    },
    'deporte-mlb': {
      title: 'Mets Beat Braves in Decisive MLB Match',
      summary: 'The Mets scored an impressive victory over the Braves in a decisive MLB match, which kept fans on the edge of their seats until the final out.',
      alt: 'Mets pitcher throwing the ball in a packed baseball stadium',
      content: [
        'The game began with both teams showing solid offensive and defensive play, but it was the Mets who managed to open the scoring in the third inning thanks to a home run by their main star.',
        'The Braves tried to react, connecting with important hits in the fifth and sixth innings, but the excellent performance of the Mets\' starting pitcher kept the rival hitters at bay.',
        'In the seventh inning, the Mets extended their lead with a strategic double steal and a timely single, securing a comfortable margin before the close of the game.',
        'The Mets\' bullpen showed solidity, closing out the game without allowing additional runs and securing the victory with a final score of 5-3.',
        'With this win, the Mets strengthen their aspirations to reach the postseason and place pressure on the Braves in the division standings.',
        'Fans celebrated with enthusiasm, while the Mets players highlighted the collective effort and focus they maintained throughout the game.',
        'The Braves, although disappointed, promised to recover in the upcoming matches and fight until the end to keep their options alive in the season.',
        'This game will remain one of the most memorable moments of the regular season, showing the talent and determination of both teams in the MLB.'
      ]
    },
    'deporte-natacion': {
      title: 'US Team Dominates 4x100m Relay at World Aquatics Championships',
      summary: 'The US team established itself as the main protagonist in the 4x100 meter relay at the World Aquatics Championships, dominating the competition from start to finish and taking the gold medal with an impressive time.',
      alt: 'US relay team celebrating their gold medal victory in the pool',
      content: [
        'The team, composed of four elite swimmers, showed perfect coordination and precise relay exchanges, making their superiority over rivals from around the world clear.',
        'From the start to the final leg, the Americans maintained the lead, with each swimmer delivering a standout performance that contributed to the team\'s personal record and decisive victory.',
        'The crowd at the pool and millions of viewers around the world celebrated the team\'s flawless performance, which reaffirms the historic strength of the United States in relay events.',
        'The swimmers expressed their excitement after the competition, highlighting the importance of teamwork, discipline, and the physical and mental preparation that led them to triumph.',
        'The competition was closely followed by the teams from Australia, the United Kingdom, and China, who also offered a high level of performance, although they could not overcome the United States\' lead.',
        'With this result, the US team consolidates its position as a favorite in future international competitions and increases its chances of continuing to break records on the world stage.',
        'The win in the 4x100 meter relay represents not just another medal for the country, but also an example of strategy, synchronization, and talent that inspires new generations of swimmers.',
        'The World Aquatics Championships continue with other exciting events, where athletes from different nations will fight for medals and to leave their mark on this prestigious international competition.',
        'Without a doubt, the US performance in the 4x100 meter relay will be remembered as one of the highlights of the World Championships, demonstrating the power and dedication of its swim team.'
      ]
    },
    'clima-tormenta': {
      title: 'Tropical Storm Approaches the Caribbean, Alerting Several Countries',
      summary: 'A tropical storm is approaching the Caribbean, generating alerts in several countries in the region. Meteorologists have issued warnings for the population to prepare for possible heavy rains.',
      alt: 'Satellite image of a tropical storm over the Caribbean Sea',
      content: [
        'A tropical storm is approaching the Caribbean, generating alerts in several countries in the region. Meteorologists have issued warnings for the population to prepare for possible heavy rains.',
        'Meteorological authorities have issued evacuation warnings and recommended citizens take security measures, especially in low-lying coastal areas. The storm is expected to weaken in the coming hours.',
        'Tropical cyclone experts are closely monitoring the evolution of the phenomenon, suggesting it could become a hurricane if atmospheric conditions persist. Residents are being urged to remain in safe shelters until the danger passes.',
        'Airlines have canceled several flights and rescheduled routes to avoid the storm. Tourism in the region has been affected, with cancellations of hotels and cruises that depend on the weather.',
        'In summary, the current meteorological situation requires maximum attention from authorities and the population, as the effects of the storm could be devastating if necessary precautions are not taken.'
      ]
    },
    'clima-calor': {
      title: 'Extreme Heat Wave Affects Several Regions of the Country',
      summary: 'Maximum temperatures exceed 40 degrees in several provinces, generating health risk alerts.',
      alt: 'Thermometer showing extreme high temperature in a city landscape',
      content: [
        'A historic heatwave is affecting much of Europe, causing record temperatures in several cities.',
        'Authorities have issued alerts to take extreme precautions, especially for the elderly and people with chronic diseases.',
        'Temperatures above 40°C are expected in southern European regions over the next few days.',
        'Health services recommend staying hydrated, avoiding prolonged sun exposure, and following local protection instructions.',
        'Several countries have activated emergency plans to deal with the risks associated with extreme heat, including the use of cooling centers.',
        'The heatwave is expected to continue for at least a week, while meteorologists monitor the progress and intensity of the phenomenon.'
      ]
    },
    'clima-inundaciones': {
      title: 'Floods Affect Thousands of People in the South',
      summary: 'Torrential rains have caused rivers to overflow, affecting entire communities.',
      alt: 'Flooded streets in a South American city after torrential rains',
      content: [
        'Heavy rains have hit several regions of South America in recent days, causing severe flooding that has affected thousands of people and left significant material damage.',
        'The countries hardest hit by the intense rainfall are Brazil, Argentina, Paraguay, Bolivia, and Peru, where river overflows, landslides, and road closures have been reported.',
        'In southern Brazil, torrential rains caused the Taquari River to overflow, flooding dozens of municipalities in the state of Rio Grande do Sul. Local authorities reported that hundreds of families had to be evacuated and temporary shelters have been set up for those affected.',
        'In Paraguay, the Paraguay River exceeded its critical level and flooded several areas of Asunción and riverside towns. The National Emergency Secretariat deployed rescue teams and distributed food and drinking water to affected families.',
        'Meanwhile, in Bolivia, heavy rainfall has caused landslides in mountainous areas, blocking roads and affecting rural communities. The government declared an orange alert in several departments due to the risk of new landslides.',
        'In northern Argentina, the provinces of Misiones and Corrientes are also facing serious problems due to water accumulation. Agricultural fields are flooded, causing concern in the agricultural sector over potential crop losses.',
        'Regional meteorological services warn that rains will continue over the next few days due to a low-pressure system combined with warm currents from the Atlantic, which could worsen the situation in the most vulnerable areas.',
        'Authorities have recommended that the population stay informed, avoid traveling through flooded areas, and follow the instructions of emergency agencies.',
        'International organizations, such as the Red Cross and the UN, have expressed their readiness to provide humanitarian support, sending assistance teams and resources to help the affected communities.',
        'Regional governments are working together to coordinate efforts and mitigate the impact of the rains, while damage is assessed and long-term recovery strategies are planned.',
        'The intense rainfall once again brings the debate over the effects of climate change in South America to the table, where extreme weather events have become increasingly frequent and unpredictable.',
        'The situation continues to be closely monitored by authorities, who call for solidarity and cooperation to face one of the most severe climate emergencies in recent years in the region.'
      ]
    },
    'clima-nevadas': {
      title: 'Historic Snowfall Paralyzes the North of the Country',
      summary: 'The heaviest snowfall in decades has left several northern populations isolated.',
      alt: 'Snow-covered roads and buildings in northern Europe',
      content: [
        'Intense snowfall is affecting northern Europe, causing significant transportation disruptions and posing risks to the population in several regions.',
        'Heavy snow precipitation has accumulated in large quantities on roads, streets, and highways, forcing authorities to implement temporary closures to ensure driver safety.',
        'Delays and flight cancellations have been reported at international and regional airports, as well as disruptions in train services and public transportation due to tracks blocked by snow and ice.',
        'Extreme conditions have led to traffic accidents and difficulties for emergency vehicles, leading rescue and maintenance services to work tirelessly to clear main routes.',
        'Citizens are recommended to avoid unnecessary travel and use public transportation only when safe, in addition to following local authority directions and updated meteorological reports.',
        'Regional governments have activated contingency plans, including temporary shelters, assistance for vulnerable people, and distribution of protective gear and essential supplies in affected areas.',
        'Meteorologists warn that snowfall could continue for several days, and that low temperatures and possible snowstorms are expected, which could worsen the situation, especially in rural and mountainous areas.',
        'Authorities have requested public cooperation to report any incident, stay informed through official channels, and take extra precautions to protect themselves from extreme cold.',
        'Additionally, drivers have been recommended to equip their vehicles with winter tires, chains, and emergency kits, and stay alert to sudden weather changes that could affect road safety.',
        'Overall, the snowfall is generating a considerable impact on daily life, forcing many people to work from home and plan their travel in advance to avoid unnecessary risks.'
      ]
    },
    'clima-tornado': {
      title: 'Tornado Causes Serious Damage in the Center of the Country',
      summary: 'An F3 category tornado has left a trail of destruction in several inland communities, causing significant material damage and affecting hundreds of families.',
      alt: 'F3 tornado touching down in a residential area',
      content: [
        'A powerful F3 category tornado hit several communities in the center of the country, leaving a trail of destruction that has affected more than 500 families and caused damage estimated in millions of dollars.',
        'Civil protection authorities have deployed rescue and humanitarian assistance teams to the hardest-hit areas, where numerous homes have been destroyed or severely damaged.',
        'The national meteorological service had issued severe storm warnings hours before the tornado\'s passage, allowing many people to seek shelter in time.',
        'Emergency teams continue working on cleanup and damage assessment, while local authorities set up collection centers for those affected.',
        'The government has declared a state of emergency in the most affected municipalities and has promised resources for reconstruction and assistance to the victims.',
        'Experts in meteorological phenomena warn of the possibility of new severe events in the coming hours due to unstable atmospheric conditions in the region.'
      ]
    },
    'clima-tormenta-atlantico': {
      title: 'Tropical Storm Intensifies in the Atlantic',
      summary: 'A tropical storm is intensifying in the Atlantic, generating alerts in several Caribbean islands. Authorities issue preparedness warnings.',
      alt: 'Tropical storm intensifies in the Atlantic'
    },
    'clima-calor-europa': {
      title: 'Record Heat Wave Affects Southern Europe',
      summary: 'Historical temperatures are recorded in Spain, Italy, and Greece. Authorities implement emergency plans for extreme heat.',
      alt: 'Record heat wave affects Southern Europe'
    },
    'clima-inundaciones-asia': {
      title: 'Floods Cause Evacuations in Asia',
      summary: 'Intense monsoons cause massive flooding in Southeast Asia. Thousands of people are evacuated to safe zones.',
      alt: 'Floods cause evacuations in Asia'
    },
    'clima-huracan-costa': {
      title: 'Category 4 Hurricane Approaches the East Coast',
      summary: 'A powerful category 4 hurricane approaches the east coast of the US with winds of up to 230 km/h. Mandatory evacuations are ordered.',
      alt: 'Category 4 hurricane approaches the east coast'
    },
    'justicia-homicidio': {
      title: 'Homicide Investigation Underway in City Center',
      summary: 'Local police have launched an investigation following a homicide that occurred in the city center during the early hours of Friday, generating alarm in the community.',
      alt: 'Police cordoning off a city street during a homicide investigation',
      content: [
        'Authorities reported that the incident took place near the intersection of the main avenues, in an area with high commercial activity. Witnesses present at the scene recounted hearing screams and gunshots before the first emergency teams arrived.',
        'Officers found the victim with serious injuries and confirmed his death at the scene. Law enforcement forces have cordoned off the area to preserve evidence and allow experts to conduct corresponding proceedings.',
        'Photographs, fingerprints, and security camera footage are expected to be taken to assist in identifying those responsible. The city\'s mayor issued a statement expressing concern over the increase in violence in the central area.',
        'The victim, whose identity has not been officially revealed, is believed to be a man between 25 and 35 years old. Police call on anyone who witnessed the events to approach authorities with information.',
        'Residents and merchants in the area expressed their fear and asked for a greater police presence during the night. The police department reported that updates on the investigation are expected in the coming hours.',
        'Meanwhile, citizens are advised to avoid traveling through the area during night hours and report any suspicious activity to the local emergency number. This event has reopened the debate on urban security and crime prevention policies.'
      ]
    },
    'justicia-tribunal-supremo': {
      title: 'Supreme Court Confirms Landmark Sentence in Corruption Case',
      summary: 'The Supreme Court has confirmed the sentence handed down in a political corruption case that has shocked the country, setting an important precedent in the fight against impunity.',
      alt: 'Judges entering the Supreme Court for a landmark ruling',
      content: [
        'The decision of the country\'s highest court was unanimous and ratifies the convictions imposed by lower courts against several high-level officials involved in acts of corruption.',
        'The case, which has lasted more than three years, has been one of the most high-profile of the last decade, revealing a network of bribes and favoritism that affected the awarding of public contracts worth millions of dollars.',
        'The Supreme Court justices highlighted in their ruling the importance of maintaining the integrity of public service and sending a clear message about the consequences of corruption.',
        'Civil society organizations have celebrated the decision, considering it a victory for the rule of law and a fundamental step in consolidating strong democratic institutions.',
        'Defense attorneys have announced that they will file international appeals, arguing violations of due process during the different stages of the trial.',
        'The government has highlighted that this sentence demonstrates the independence of the judiciary and the commitment of institutions to transparency and accountability.',
        'Legal experts believe that this ruling will strengthen corruption prevention mechanisms and serve as a deterrent for future public officials.'
      ]
    },
    'justicia-condena-criminal': {
      title: 'Leader of International Criminal Organization Sentenced to Life Imprisonment',
      summary: 'The leader of an international criminal organization has been sentenced to life imprisonment after a long judicial process that spanned several years.',
      alt: 'Courtroom during the sentencing of an international criminal leader',
      content: [
        'The sentence was handed down by a specialized court for organized crime offenses, after conclusive evidence was presented linking the accused to illegal activities worldwide, including drug trafficking, money laundering, and corruption.',
        'During the trial, testimony from former members of the organization and financial evidence were presented, demonstrating the scale of the illegal operations led by the convicted individual.',
        'Authorities highlighted the importance of this sentence as a key step in the fight against international organized crime and assured that they will continue working to dismantle associated criminal networks.',
        'The court noted that the severity of the sentence responds to the high risk the accused represented to public safety and the need to send a strong message about the intolerance of organized criminality.',
        'Legal experts have indicated that this ruling could set a precedent for future international crime cases, strengthening cooperation between countries and international organizations in the prosecution of transnational crimes.',
        'The family of the convicted man and his lawyers announced that they will evaluate possible appeals, although they acknowledged that the evidence presented during the trial makes any possibility of sentence reduction difficult.',
        'The international community has received the news with attention, highlighting the importance of applying justice effectively and coordinately in cases of high criminality and global reach.',
        'Meanwhile, authorities continue to investigate and monitor the organization\'s operations to ensure that no loose ends remain that could allow illegal activities to continue.'
      ]
    },
    'justicia-fiscalia-empresa': {
      title: 'Prosecutor\'s Office Launches Trial Against Company for Million-Dollar Tax Evasion',
      summary: 'The Attorney General\'s Office has initiated a trial against a major national company accused of million-dollar tax evasion, which could lead to historic sanctions.',
      alt: 'Corporate building with prosecutor office investigators entering',
      content: [
        'According to preliminary reports, the company allegedly failed to declare significant income for several years, causing economic harm to the State. The case was opened following an investigation by the specialized financial crimes unit.',
        'During the initial hearing, company representatives denied the accusations, assuring that all accounting records comply with current regulations. However, the Prosecutor\'s Office presented documents and evidence showing the alleged evasion.',
        'The judge in charge of the case established a schedule of hearings to hear from witnesses and experts. Public opinion has shown great interest in the case, given the company\'s relevance to the national economy.',
        'If the accusations are confirmed, the company could face million-dollar fines and criminal liability for its executives. Authorities emphasize the importance of this trial as a message of rigor.',
        'The coming weeks are expected to be decisive in determining the future of the company and the impact of this case on the business sector.'
      ]
    },
    'justicia-juez-homicidio-multiple': {
      title: 'Judge Orders Preventive Detention for Multiple Homicide Suspect',
      summary: 'The judge in the case has ordered preventive detention for the accused, considering it necessary to ensure his presence at the trial due to the gravity of the charges and the flight risk.',
      alt: 'Judge reviewing case files for a multiple homicide suspect',
      content: [
        'The decision was made after a hearing where compelling evidence was presented linking the accused to several homicides that occurred in the city during recent months. The prosecutor argued that the defendant\'s freedom would represent a danger to society.',
        'The defense of the accused stated that they will respect the judge\'s decision but announced they will file legal appeals to request a review of the measure. Meanwhile, the accused will remain in a maximum-security detention center.',
        'Families of the victims have received the decision with relief, highlighting the importance of the judicial process advancing without setbacks. Authorities have reinforced security around the case to prevent incidents.',
        'Legal experts point out that preventive detention is an exceptional but justified measure in cases of extreme gravity like this one. The trial is scheduled to begin in the coming months and is expected to be one of the most high-profile of the year.',
        'The community remains attentive to the development of events, hoping for justice for the victims and their families.'
      ]
    },
    'opinion-politica': {
      title: 'Democracy and the Challenge of Transparency',
      summary: 'Citizen trust increasingly depends on open and accountable institutions.',
      alt: 'Illustration of democratic institutions and transparency concepts',
      content: [
        'In today\'s complex political landscape, transparency has consolidated itself not only as an ethical requirement but as the fundamental pillar supporting the legitimacy of modern democracies. Citizen trust in their representatives and institutions has been eroded by years of opacity and lack of accountability, creating a gap that can only be closed with light and honesty.',
        'True transparency goes beyond publishing documents on web portals; it implies a real will to expose decision-making processes to public scrutiny. When governments hide the reasons behind their policies or the details of their spending, they foster a climate of suspicion that fuels populism and political disaffection.',
        'It is imperative that our institutions adopt open technologies and citizen audit processes. A democracy that fears transparency is a democracy that doubts its own value. The challenge is enormous, but the cost of opacity is, quite simply, unacceptable for a society that aspires to be truly free.'
      ]
    },
    'opinion-economia': {
      title: 'Where is the Global Economy Heading?',
      summary: 'We analyze the factors that will mark the economic course in the coming years.',
      alt: 'Visual representation of global economic trends and AI technology',
      content: [
        'We find ourselves at an unprecedented turning point in contemporary economic history. Globalization, as we knew it, is being redefined by geopolitical tensions, the energy transition, and the massive emergence of artificial intelligence. These factors are not only changing what we produce, but how and where we do it.',
        'Inflation, although it seems to be under control in some regions, has left a deep mark on the cost structure of companies and family budgets. The great challenge for central banks will be to navigate this new environment without stifling the growth necessary to finance the transition to a green economy.',
        'In the long term, sustainability will be the main driver of economic value. Those countries and companies that fail to adapt their business models to the planet\'s limits will find themselves marginalized. The global economy of the future will not only be digital; it will be fundamentally regenerative or it will not be at all.'
      ]
    },
    'opinion-salud': {
      title: 'The Importance of Preventive Health',
      summary: 'Investing in prevention is fundamental to maintaining a healthy population and reducing healthcare costs.',
      alt: 'Illustration of preventive healthcare and medical checkups',
      content: [
        'The global healthcare system has historically been focused on the cure, reacting to disease once it manifests. However, the true medical revolution of the 21st century lies in prevention. Investing in preventive health is not just a matter of individual well-being; it is a survival strategy for public health systems.',
        'Every euro invested in vaccination campaigns, early detection, and the promotion of healthy habits saves thousands of euros in chronic treatments and complex hospitalizations. Technology today allows us to monitor our health in real-time, offering us a unique opportunity to intervene before the damage is irreversible.',
        'Preventive health requires a cultural paradigm shift: moving from being passive patients to being active managers of our own well-being. Only through education and equitable access to preventive services can we guarantee longevity that is truly healthy and dignified for everyone.'
      ]
    }
  };

  const translateText = (text: string | string[], id?: string, field?: string) => {
    if (!text) return text;
    
    // Check for real translation
    if (id && REAL_TRANSLATIONS[id] && REAL_TRANSLATIONS[id][field as string]) {
      return REAL_TRANSLATIONS[id][field as string];
    }

    if (Array.isArray(text)) {
      return text.map(p => `[EN] ${p}`);
    }
    return `[EN] ${text}`;
  };

  const translateCategory = (cat: string) => {
    const map: Record<string, string> = {
      'Política': 'Politics',
      'Internacional': 'International',
      'Economía': 'Economy',
      'Salud': 'Health',
      'Deporte': 'Sports',
      'Clima': 'Weather',
      'Justicia': 'Justice',
      'Opinión': 'Opinion'
    };
    return map[cat] || cat;
  };

  Object.entries(data.articles).forEach(([id, article]) => {
    enData.articles[id] = {
      title: translateText(article.title, id, 'title'),
      summary: translateText(article.summary, id, 'summary'),
      category: translateCategory(article.category),
      alt: translateText(article.alt, id, 'alt'),
    };
    if (article.content) {
      enData.articles[id].content = translateText(article.content, id, 'content');
    }
  });

  Object.entries(data.categories).forEach(([slug, cat]) => {
    enData.categories[slug] = {
      label: translateCategory(cat.label),
      description: translateText(cat.description),
      latestTitle: `More in ${translateCategory(cat.label)}`,
      sidebarTitle: 'Opinion',
      featuredSectionTitle: translateCategory(cat.featuredSectionTitle),
    };
  });

  compileMergedMessages('en', enData);
};

extractData();
