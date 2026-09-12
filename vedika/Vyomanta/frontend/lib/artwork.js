// Subject and category artwork resolver for courses, quizzes, and assignments

export const SUBJECT_ARTWORK = {
  // Biology & Health
  'Biology': 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Human Anatomy': 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Life Process': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',

  // Chemistry
  'Chemistry': 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Chemical Bonds': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Atomic Structure': 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',

  // Physics
  'Physics': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Electricity': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Friction': 'https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',

  // Social & History
  'Social': 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'History': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',

  // Programming & Computer Science
  'Programming': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Java': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Python Fundamentals': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Python Programming': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Data Structures & Algorithms': 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Web Development': 'https://images.unsplash.com/photo-1547658719-da2b51169166?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Collaborate': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Frontend': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Framework': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',

  // Other Domains
  'Design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Business': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Personal Development': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Data Science': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Artificial Intelligence': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Cybersecurity': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  'Cloud Computing': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
};

/**
 * Intelligently resolve the most accurate, high-quality artwork URL
 * based on category, title, or keywords.
 */
export function getSubjectArtwork(category = '', title = '') {
  const normCat = (category || '').trim();
  const normTitle = (title || '').trim();

  // 1. Direct title match
  if (normTitle && SUBJECT_ARTWORK[normTitle]) {
    return SUBJECT_ARTWORK[normTitle];
  }

  // 2. Direct category match
  if (normCat && SUBJECT_ARTWORK[normCat]) {
    return SUBJECT_ARTWORK[normCat];
  }

  const combined = `${normCat} ${normTitle}`.toLowerCase();

  // 3. Keyword matching for custom or unlisted categories/courses
  if (combined.includes('bio') || combined.includes('anat') || combined.includes('life') || combined.includes('organ') || combined.includes('cell')) {
    return SUBJECT_ARTWORK['Biology'];
  }
  if (combined.includes('chem') || combined.includes('atom') || combined.includes('bond') || combined.includes('molec') || combined.includes('acid')) {
    return SUBJECT_ARTWORK['Chemistry'];
  }
  if (combined.includes('phys') || combined.includes('elect') || combined.includes('frict') || combined.includes('force') || combined.includes('grav') || combined.includes('motion')) {
    return SUBJECT_ARTWORK['Physics'];
  }
  if (combined.includes('hist') || combined.includes('soc') || combined.includes('civ') || combined.includes('cult') || combined.includes('revol')) {
    return SUBJECT_ARTWORK['Social'];
  }
  if (combined.includes('math') || combined.includes('calc') || combined.includes('geom') || combined.includes('alg') || combined.includes('stat')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';
  }
  if (combined.includes('java')) {
    return SUBJECT_ARTWORK['Java'];
  }
  if (combined.includes('python')) {
    return SUBJECT_ARTWORK['Python Fundamentals'];
  }
  if (combined.includes('data struct') || combined.includes('algorithm') || combined.includes('tree') || combined.includes('graph')) {
    return SUBJECT_ARTWORK['Data Structures & Algorithms'];
  }
  if (combined.includes('web') || combined.includes('next') || combined.includes('react') || combined.includes('front') || combined.includes('collab')) {
    return SUBJECT_ARTWORK['Web Development'];
  }
  if (combined.includes('design') || combined.includes('ui') || combined.includes('ux') || combined.includes('art')) {
    return SUBJECT_ARTWORK['Design'];
  }
  if (combined.includes('bus') || combined.includes('manag') || combined.includes('strat')) {
    return SUBJECT_ARTWORK['Business'];
  }
  if (combined.includes('fin') || combined.includes('money') || combined.includes('invest') || combined.includes('bank')) {
    return SUBJECT_ARTWORK['Finance'];
  }

  // Fallback to high-quality general learning artwork
  return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';
}
