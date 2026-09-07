import React from 'react';
import { PageHeader } from '../../shell/PageHeader';
import { PRIVACY_POLICY_SECTIONS, type PrivacyPolicyBlock } from './privacyPolicy';
import './account.css';

// Порт screens/account/PrivacyPolicyScreen.tsx: заголовок с «назад», вступление, секции и подсекции.

const renderBlocks = (blocks: PrivacyPolicyBlock[]) =>
  blocks.map((block, index) => {
    if (block.type === 'paragraph') {
      return (
        <p key={`p-${index}`} className="privacy__paragraph">
          {block.text}
        </p>
      );
    }
    return (
      <ul key={`l-${index}`} className="privacy__list">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex} className="privacy__list-item">
            <span className="privacy__bullet">•</span>
            <span className="privacy__list-text">{item}</span>
          </li>
        ))}
      </ul>
    );
  });

export const PrivacyPolicyScreen: React.FC = () => (
  <>
    <PageHeader title="Политика конфиденциальности" back />
    <div className="page-body">
      <article className="privacy text-selectable">
        <p className="privacy__intro">Политика обработки персональных данных Totus Club</p>
        {PRIVACY_POLICY_SECTIONS.map((section, sectionIndex) => (
          <section key={sectionIndex} className="privacy__section">
            <h2 className="privacy__section-title">{section.title}</h2>
            {renderBlocks(section.blocks)}
            {section.subsections?.map((subsection, subIndex) => (
              <div key={subIndex} className="privacy__subsection">
                <h3 className="privacy__subsection-title">{subsection.title}</h3>
                {renderBlocks(subsection.blocks)}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  </>
);

export default PrivacyPolicyScreen;
